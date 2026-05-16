import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface PlaceResult {
  placeId:          string;
  lat:              number;
  lng:              number;
  formattedAddress: string;
  rating:           number | null;
  priceLevel:       number | null;
  photoRef:         string | null;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly placesKey: string;

  constructor(private readonly config: ConfigService) {
    this.placesKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') ?? '';
  }

  async geocodePlace(name: string, country: string, city?: string): Promise<PlaceResult | null> {
    const query = city ? `${name} ${city} ${country}` : `${name} ${country}`;
    try {
      const { data } = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        { params: { query, key: this.placesKey } },
      );
      const results = data.results ?? [];
      if (!results.length) return null;
      const first = results[0];
      return {
        placeId:          first.place_id,
        lat:              first.geometry.location.lat,
        lng:              first.geometry.location.lng,
        formattedAddress: first.formatted_address,
        rating:           first.rating ?? null,
        priceLevel:       first.price_level ?? null,
        photoRef:         first.photos?.[0]?.photo_reference ?? null,
      };
    } catch (err) {
      this.logger.error(`geocodePlace failed for "${query}": ${err.message}`);
      return null;
    }
  }

  buildPhotoUrl(photoRef: string, maxwidth = 400): string {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${encodeURIComponent(photoRef)}&key=${this.placesKey}`;
  }

  buildStaticMapUrl(markers: Array<{ lat: number; lng: number }>, width = 600, height = 300): string {
    const key = this.placesKey;
    const markerParams = markers
      .map(m => `markers=color:blue|${m.lat},${m.lng}`)
      .join('&');
    return `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&${markerParams}&key=${key}`;
  }

  async geocodeCountry(country: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const geocodingKey = this.config.get<string>('GOOGLE_MAPS_API_KEY') ?? this.placesKey;
      const { data } = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        { params: { address: country, key: geocodingKey } },
      );
      const results = data.results ?? [];
      if (!results.length) return null;
      const loc = results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    } catch (err) {
      this.logger.error(`geocodeCountry failed for "${country}": ${err.message}`);
      return null;
    }
  }
}
