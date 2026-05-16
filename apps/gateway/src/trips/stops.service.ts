import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TripStop, AffiliateLink, ContentInsights, Job as PFJob } from '@app/database';
import { QUEUES, JOBS } from '@app/queue';
import { AffiliateGeneratorService } from '../affiliates/affiliate-generator.service';
import { TripsService } from './trips.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { BulkImportStopsDto } from './dto/bulk-import-stops.dto';

const KEYWORDS: Record<string, string[]> = {
  stay:      ['hotel', 'hostel', 'check in', 'airbnb', 'accommodation', 'resort'],
  food:      ['eat', 'restaurant', 'cafe', 'food', 'ramen', 'sushi', 'dining', 'lunch', 'dinner', 'breakfast'],
  activity:  ['visit', 'museum', 'show', 'teamlab', 'tour', 'experience', 'park', 'temple'],
  transport: ['train', 'subway', 'bus', 'flight', 'taxi', 'airport', 'station'],
};

function inferStopType(text: string): string {
  const lower = (text ?? '').toLowerCase();
  for (const [type, words] of Object.entries(KEYWORDS)) {
    if (words.some(w => lower.includes(w))) return type;
  }
  return 'place';
}

@Injectable()
export class StopsService {
  constructor(
    @InjectRepository(TripStop)
    private readonly stopRepo: Repository<TripStop>,
    @InjectRepository(AffiliateLink)
    private readonly linkRepo: Repository<AffiliateLink>,
    @InjectRepository(ContentInsights)
    private readonly insightsRepo: Repository<ContentInsights>,
    @InjectRepository(PFJob)
    private readonly jobRepo: Repository<PFJob>,
    @InjectQueue(QUEUES.GEOCODE)
    private readonly geocodeQueue: Queue,
    private readonly affiliateGen: AffiliateGeneratorService,
    private readonly tripsService: TripsService,
  ) {}

  async addStop(userId: string, dto: CreateStopDto): Promise<TripStop> {
    const trip = await this.tripsService.findOwned(userId, dto.tripId);

    let position = dto.position;
    if (!position) {
      const existing = await this.stopRepo.find({ where: { tripId: trip.id, dayNumber: dto.dayNumber } });
      position = existing.length + 1;
    }

    const stop = this.stopRepo.create({
      tripId:            trip.id,
      dayNumber:         dto.dayNumber,
      position,
      stopType:          dto.stopType,
      name:              dto.name,
      notes:             dto.notes             ?? undefined,
      timeOfDay:         dto.timeOfDay         ?? undefined,
      durationMinutes:   dto.durationMinutes   ?? undefined,
      priceEstimate:     dto.priceEstimate     ?? undefined,
      currency:          dto.currency          ?? undefined,
      sourceJobId:       dto.sourceJobId       ?? undefined,
      sourceInsightType: dto.sourceInsightType ?? undefined,
    });

    const saved = (await this.stopRepo.save(stop)) as unknown as TripStop;

    const linkDefs = this.affiliateGen.generateLinks(saved, trip.country);
    if (linkDefs.length) {
      const links = linkDefs.map(l =>
        this.linkRepo.create({ tripStopId: saved.id, ...l }),
      );
      await this.linkRepo.save(links);
    }

    await this.geocodeQueue.add(JOBS.GEOCODE, {
      tripStopId: saved.id,
      tripId:     trip.id,
      name:       saved.name,
      country:    trip.country,
      city:       null,
    });

    return saved;
  }

  async bulkImportStops(userId: string, tripId: string, dto: BulkImportStopsDto): Promise<TripStop[]> {
    const trip     = await this.tripsService.findOwned(userId, tripId);
    const insights = await this.insightsRepo.findOne({ where: { jobId: dto.jobId } });
    if (!insights) throw new NotFoundException('No insights found for this job');

    const types = dto.types ?? ['stays', 'places', 'food', 'itinerary'];

    const existingForDay = await this.stopRepo.find({
      where: { tripId, dayNumber: dto.dayNumber },
    });
    let position = existingForDay.length + 1;

    const created: TripStop[] = [];

    if (types.includes('stays') && Array.isArray(insights.stays)) {
      for (const item of insights.stays as any[]) {
        const stop = await this._createRaw(trip, {
          dayNumber: dto.dayNumber, position: position++,
          stopType: 'stay', name: item.name ?? 'Unknown stay',
          notes: item.description ?? null,
          priceEstimate: item.price ?? null,
          currency: insights.currency ?? null,
          sourceJobId: dto.jobId, sourceInsightType: 'stays',
        });
        created.push(stop);
      }
    }

    if (types.includes('places') && Array.isArray(insights.places)) {
      for (const item of insights.places as any[]) {
        const stop = await this._createRaw(trip, {
          dayNumber: dto.dayNumber, position: position++,
          stopType: 'place', name: item.name ?? 'Unknown place',
          notes: item.description ?? null,
          sourceJobId: dto.jobId, sourceInsightType: 'places',
        });
        created.push(stop);
      }
    }

    if (types.includes('food') && Array.isArray(insights.food)) {
      for (const item of insights.food as any[]) {
        const name = item.name + (item.restaurant ? ` at ${item.restaurant}` : '');
        const stop = await this._createRaw(trip, {
          dayNumber: dto.dayNumber, position: position++,
          stopType: 'food', name,
          notes: item.description ?? null,
          priceEstimate: item.price ?? null,
          currency: insights.currency ?? null,
          sourceJobId: dto.jobId, sourceInsightType: 'food',
        });
        created.push(stop);
      }
    }

    if (types.includes('itinerary') && Array.isArray(insights.itinerary)) {
      for (const day of insights.itinerary as any[]) {
        if (!Array.isArray(day.stops)) continue;
        for (const s of day.stops) {
          const name = s.place ?? s.description ?? 'Stop';
          const stop = await this._createRaw(trip, {
            dayNumber: dto.dayNumber, position: position++,
            stopType: inferStopType(s.description ?? ''),
            name, notes: s.description ?? null,
            timeOfDay: s.time ?? null,
            sourceJobId: dto.jobId, sourceInsightType: 'itinerary',
          });
          created.push(stop);
        }
      }
    }

    return created;
  }

  private async _createRaw(trip: any, fields: any): Promise<TripStop> {
    const stop = this.stopRepo.create({ tripId: trip.id, ...fields });
    const saved = (await this.stopRepo.save(stop)) as unknown as TripStop;

    const linkDefs = this.affiliateGen.generateLinks(saved, trip.country);
    if (linkDefs.length) {
      await this.linkRepo.save(linkDefs.map(l => this.linkRepo.create({ tripStopId: saved.id, ...l })));
    }

    await this.geocodeQueue.add(JOBS.GEOCODE, {
      tripStopId: saved.id,
      tripId:     trip.id,
      name:       saved.name,
      country:    trip.country,
      city:       null,
    });

    return saved;
  }

  async updateStop(userId: string, stopId: string, dto: UpdateStopDto): Promise<TripStop> {
    const stop = await this.stopRepo.findOne({ where: { id: stopId } });
    if (!stop) throw new NotFoundException('Stop not found');
    const trip = await this.tripsService.findOwned(userId, stop.tripId);

    const nameChanged = dto.name && dto.name !== stop.name;
    Object.assign(stop, dto);
    const saved = await this.stopRepo.save(stop);

    if (nameChanged) {
      await this.geocodeQueue.add(JOBS.GEOCODE, {
        tripStopId: saved.id,
        tripId:     trip.id,
        name:       saved.name,
        country:    trip.country,
        city:       null,
      });
    }

    return saved;
  }

  async deleteStop(userId: string, stopId: string): Promise<void> {
    const stop = await this.stopRepo.findOne({ where: { id: stopId } });
    if (!stop) throw new NotFoundException('Stop not found');
    await this.tripsService.findOwned(userId, stop.tripId);
    await this.linkRepo.delete({ tripStopId: stopId });
    await this.stopRepo.delete(stopId);
  }

  async reorderStops(userId: string, tripId: string, dayNumber: number, orderedIds: string[]): Promise<void> {
    await this.tripsService.findOwned(userId, tripId);
    await Promise.all(
      orderedIds.map((id, idx) =>
        this.stopRepo.update({ id, tripId, dayNumber }, { position: idx + 1 }),
      ),
    );
  }
}
