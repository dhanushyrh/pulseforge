import {
  Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip, TripStop } from '@app/database';
import { MapsService } from '../maps/maps.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { randomUUID } from 'crypto';

const TRIP_LIMITS: Record<string, number> = {
  free:  3,
  pro:   Infinity,
  admin: Infinity,
};

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(TripStop)
    private readonly stopRepo: Repository<TripStop>,
    private readonly maps: MapsService,
  ) {}

  async createTrip(userId: string, plan: string, dto: CreateTripDto): Promise<Trip> {
    const limit = TRIP_LIMITS[plan] ?? TRIP_LIMITS.free;
    if (limit !== Infinity) {
      const count = await this.tripRepo.count({ where: { userId } });
      if (count >= limit) {
        throw new HttpException(
          `Trip limit reached. Free plan allows ${limit} trips. Upgrade to Pro for unlimited trips.`,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    const trip = this.tripRepo.create({
      userId,
      title:       dto.title,
      country:     dto.country,
      countryCode: dto.countryCode ?? undefined,
      startDate:   dto.startDate  ?? undefined,
      endDate:     dto.endDate    ?? undefined,
      dayCount:    dto.dayCount   ?? 7,
      status:      'draft',
      defaultZoom: 11,
    });

    const saved = (await this.tripRepo.save(trip)) as unknown as Trip;

    const center = await this.maps.geocodeCountry(dto.country);
    if (center) {
      await this.tripRepo.update(saved.id, { centerLat: center.lat, centerLng: center.lng });
      saved.centerLat = center.lat;
      saved.centerLng = center.lng;
    }

    return saved;
  }

  async getTrips(userId: string) {
    const trips = await this.tripRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    const summaries = await Promise.all(
      trips.map(async (t) => {
        const stops = await this.stopRepo.find({ where: { tripId: t.id } });
        return {
          ...this.formatTrip(t),
          stopCount:  stops.length,
          stayCount:  stops.filter(s => s.stopType === 'stay').length,
        };
      }),
    );

    return summaries;
  }

  async getTripDetail(userId: string, tripId: string) {
    const trip = await this.findOwned(userId, tripId);
    return this.buildDetail(trip);
  }

  async getSharedTrip(shareToken: string) {
    const trip = await this.tripRepo.findOne({ where: { shareToken } });
    if (!trip) throw new NotFoundException('Shared trip not found');
    return this.buildDetail(trip);
  }

  async updateTrip(userId: string, tripId: string, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.findOwned(userId, tripId);
    Object.assign(trip, dto);
    return (await this.tripRepo.save(trip)) as unknown as Trip;
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    const trip = await this.findOwned(userId, tripId);
    await this.stopRepo.delete({ tripId: trip.id });
    await this.tripRepo.delete(trip.id);
  }

  async generateShareToken(userId: string, tripId: string) {
    const trip = await this.findOwned(userId, tripId);
    if (!trip.shareToken) {
      trip.shareToken = randomUUID();
      await (this.tripRepo.save(trip));
    }
    const shareUrl = `/trips/shared/${trip.shareToken}`;
    return { shareToken: trip.shareToken, shareUrl };
  }

  async recalculateCenter(tripId: string): Promise<void> {
    const stops = await this.stopRepo.find({
      where: { tripId, isGeocoded: true },
    });
    if (!stops.length) return;
    const centerLat = stops.reduce((s, st) => s + st.latitude, 0) / stops.length;
    const centerLng = stops.reduce((s, st) => s + st.longitude, 0) / stops.length;
    await this.tripRepo.update(tripId, { centerLat, centerLng });
  }

  async findOwned(userId: string, tripId: string): Promise<Trip> {
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.userId !== userId) throw new ForbiddenException('Not your trip');
    return trip;
  }

  private async buildDetail(trip: Trip) {
    const stops = await this.stopRepo.find({
      where: { tripId: trip.id },
      order: { dayNumber: 'ASC', position: 'ASC' },
    });

    const days: Record<number, { dayNumber: number; title: string; stops: TripStop[] }> = {};
    for (const stop of stops) {
      if (!days[stop.dayNumber]) {
        days[stop.dayNumber] = { dayNumber: stop.dayNumber, title: `Day ${stop.dayNumber}`, stops: [] };
      }
      days[stop.dayNumber].stops.push(stop);
    }

    return { ...this.formatTrip(trip), days };
  }

  private formatTrip(t: Trip) {
    return {
      id:                  t.id,
      title:               t.title,
      country:             t.country,
      countryCode:         t.countryCode     ?? null,
      coverImageUrl:       t.coverImageUrl   ?? null,
      startDate:           t.startDate       ?? null,
      endDate:             t.endDate         ?? null,
      dayCount:            t.dayCount,
      status:              t.status,
      shareToken:          t.shareToken      ?? null,
      centerLat:           t.centerLat       ?? null,
      centerLng:           t.centerLng       ?? null,
      defaultZoom:         t.defaultZoom,
      totalBudgetEstimate: t.totalBudgetEstimate ?? null,
      currency:            t.currency        ?? null,
      createdAt:           t.createdAt,
      updatedAt:           t.updatedAt,
    };
  }
}
