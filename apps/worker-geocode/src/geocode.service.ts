import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Client as MinioClient } from 'minio';
import { TripStop, Trip, PlaceDetails, PlacePhoto } from '@app/database';

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly apiKey: string;
  private readonly bucket: string;
  private readonly minio: MinioClient;

  constructor(
    @InjectRepository(TripStop)
    private readonly stopRepo: Repository<TripStop>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(PlaceDetails)
    private readonly placeDetailsRepo: Repository<PlaceDetails>,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') ?? '';
    this.bucket = process.env.MINIO_BUCKET ?? 'pulseforge-media';
    this.minio  = new MinioClient({
      endPoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
      port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL:    false,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });
  }

  async geocode(stopId: string, tripId: string, name: string, country: string, city: string | null): Promise<void> {
    const query = city ? `${name} ${city} ${country}` : `${name} ${country}`;

    try {
      const { data } = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        { params: { query, key: this.apiKey } },
      );

      const results = data.results ?? [];
      if (!results.length) {
        this.logger.warn(`[${stopId}] No geocode results for "${query}"`);
        return;
      }

      const first        = results[0];
      const lat          = first.geometry.location.lat as number;
      const lng          = first.geometry.location.lng as number;
      const placeId      = first.place_id as string;
      const address      = first.formatted_address as string;
      const rating       = first.rating ?? null;
      const priceLevel   = first.price_level ?? null;

      let thumbnailUrl: string | null = null;
      const photoRef = first.photos?.[0]?.photo_reference;
      if (photoRef) {
        thumbnailUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(photoRef)}&key=${this.apiKey}`;
      }

      await this.stopRepo.update({ id: stopId }, {
        googlePlaceId:    placeId,
        latitude:         lat,
        longitude:        lng,
        formattedAddress: address,
        googleRating:     rating     ?? undefined,
        priceLevel:       priceLevel ?? undefined,
        thumbnailUrl:     thumbnailUrl ?? undefined,
        isGeocoded:       true,
      });

      this.logger.log(`[${stopId}] Geocoded: ${name} → ${lat}, ${lng}`);

      await this.recalculateTripCenter(tripId);

      // Enrich with full Place Details
      await this.fetchPlaceDetails(placeId, stopId);
    } catch (err) {
      this.logger.error(`[${stopId}] Geocode failed: ${err.message}`);
      throw err;
    }
  }

  async fetchPlaceDetails(placeId: string, stopId: string): Promise<void> {
    try {
      // Check cache — skip API call if fetched within 30 days
      const existing = await this.placeDetailsRepo.findOne({ where: { googlePlaceId: placeId } });
      if (existing?.lastFetchedAt) {
        const ageDays = (Date.now() - existing.lastFetchedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < 30) {
          await this.stopRepo.update({ id: stopId }, { placeDetailsFetched: true });
          this.logger.log(`[${placeId}] Place details cache hit (${Math.round(ageDays)}d old)`);
          return;
        }
      }

      this.logger.log(`[${placeId}] Fetching Place Details…`);

      const fields = [
        'name', 'rating', 'user_ratings_total', 'formatted_address',
        'formatted_phone_number', 'opening_hours', 'website', 'price_level',
        'photos', 'geometry', 'types', 'editorial_summary', 'url', 'vicinity',
      ].join(',');

      const { data } = await axios.get(
        'https://maps.googleapis.com/maps/api/place/details/json',
        { params: { place_id: placeId, fields, key: this.apiKey } },
      );

      const result = data.result;
      if (!result) {
        this.logger.warn(`[${placeId}] Places Details returned no result`);
        return;
      }

      // Parse opening hours
      const openingHours = result.opening_hours ? {
        openNow:      result.opening_hours.open_now    ?? false,
        periods:      result.opening_hours.periods     ?? [],
        weekdayText:  result.opening_hours.weekday_text ?? [],
      } : null;

      // Parse photos (max 10)
      const photos: PlacePhoto[] = (result.photos ?? []).slice(0, 10).map((p: any) => ({
        photoReference: p.photo_reference,
        width:          p.width,
        height:         p.height,
        cachedUrl:      null,
      }));

      const placeType = result.types?.[0]?.replace(/_/g, ' ') ?? null;
      const allTypes  = result.types ?? [];

      // Download and cache primary photo to MinIO
      let primaryPhotoUrl: string | null = null;
      let primaryPhotoRef: string | null = photos[0]?.photoReference ?? null;

      if (photos.length > 0) {
        try {
          const photoRef = photos[0].photoReference;
          const photoResp = await axios.get(
            'https://maps.googleapis.com/maps/api/place/photo',
            {
              params:       { maxwidth: 800, photo_reference: photoRef, key: this.apiKey },
              responseType: 'arraybuffer',
              maxRedirects: 5,
            },
          );

          const buffer     = Buffer.from(photoResp.data);
          const objectName = `place-photos/${placeId}/primary.jpg`;

          await this.ensureBucket();
          await this.minio.putObject(this.bucket, objectName, buffer, buffer.length, {
            'Content-Type': 'image/jpeg',
          });

          primaryPhotoUrl   = `${this.bucket}/${objectName}`;
          photos[0].cachedUrl = primaryPhotoUrl;
          this.logger.log(`[${placeId}] Primary photo cached → ${primaryPhotoUrl}`);
        } catch (photoErr) {
          this.logger.warn(`[${placeId}] Photo cache failed: ${photoErr.message}`);
        }
      }

      // Upsert place_details record
      const upsertPayload = {
        googlePlaceId:    placeId,
        name:             result.name,
        placeType,
        allTypes,
        rating:           result.rating            ?? null,
        userRatingsTotal: result.user_ratings_total ?? null,
        formattedAddress: result.formatted_address  ?? null,
        vicinity:         result.vicinity           ?? null,
        phoneNumber:      result.formatted_phone_number ?? null,
        website:          result.website            ?? null,
        googleMapsUrl:    result.url                ?? null,
        priceLevel:       result.price_level        ?? null,
        latitude:         result.geometry?.location?.lat ?? null,
        longitude:        result.geometry?.location?.lng ?? null,
        editorialSummary: result.editorial_summary?.overview ?? null,
        openingHours,
        photos,
        primaryPhotoUrl,
        primaryPhotoRef,
        isOpenNow:        result.opening_hours?.open_now ?? false,
        lastFetchedAt:    new Date(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.placeDetailsRepo.upsert(upsertPayload as any, ['googlePlaceId']);

      // Update the stop
      const stopUpdate: Partial<TripStop> = { placeDetailsFetched: true };
      if (primaryPhotoUrl) stopUpdate.thumbnailUrl = primaryPhotoUrl;
      if (result.geometry?.location?.lat) stopUpdate.latitude  = result.geometry.location.lat;
      if (result.geometry?.location?.lng) stopUpdate.longitude = result.geometry.location.lng;
      await this.stopRepo.update({ id: stopId }, stopUpdate);

      this.logger.log(`[${placeId}] Place details saved: ${result.name} · ${result.rating ?? '—'} · ${result.user_ratings_total ?? 0} reviews`);
    } catch (err) {
      this.logger.error(`[${placeId}] fetchPlaceDetails failed: ${err.message}`);
      // Non-fatal — geocoding already succeeded
    }
  }

  private async recalculateTripCenter(tripId: string): Promise<void> {
    const stops = await this.stopRepo.find({ where: { tripId, isGeocoded: true } });
    if (!stops.length) return;
    const centerLat = stops.reduce((s, st) => s + st.latitude, 0) / stops.length;
    const centerLng = stops.reduce((s, st) => s + st.longitude, 0) / stops.length;
    await this.tripRepo.update({ id: tripId }, { centerLat, centerLng });
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.minio.bucketExists(this.bucket);
    if (!exists) await this.minio.makeBucket(this.bucket);
  }
}
