import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '@app/queue';
import type { GeocodeJobPayload } from '@app/queue';
import { GeocodeService } from './geocode.service';

@Processor(QUEUES.GEOCODE, { concurrency: 3 })
export class GeocodeProcessor extends WorkerHost {
  private readonly logger = new Logger(GeocodeProcessor.name);

  constructor(private readonly geocodeService: GeocodeService) {
    super();
  }

  async process(job: Job<GeocodeJobPayload>): Promise<void> {
    const { tripStopId, tripId, name, country, city } = job.data;
    this.logger.log(`[${tripStopId}] Geocoding "${name}"`);
    await this.geocodeService.geocode(tripStopId, tripId, name, country, city);
  }
}
