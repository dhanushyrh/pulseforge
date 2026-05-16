// apps/worker-metadata/src/metadata.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '@app/queue';
import type { MetadataJobPayload, ClassifierJobPayload } from '@app/queue';
import { MetadataService } from './metadata.service';
import { CreatorService } from './creator.service';

@Processor(QUEUES.METADATA, { concurrency: 2 })
export class MetadataProcessor extends WorkerHost {
  private readonly logger = new Logger(MetadataProcessor.name);

  constructor(
    private readonly metadataService: MetadataService,
    private readonly creatorService:  CreatorService,
    @InjectQueue(QUEUES.CLASSIFIER)
    private readonly classifierQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<MetadataJobPayload>): Promise<void> {
    const { jobId, url, storagePath, mediaId } = job.data;
    this.logger.log(`[${jobId}] Extracting metadata`);

    try {
      // Extract from yt-dlp
      const meta = await this.metadataService.extract(jobId, url);

      // Persist to DB
      await this.metadataService.persistMetadata(jobId, meta);

      // Upsert creator profile
      if (meta.creatorData) {
        await this.creatorService.upsert(
          meta.creatorData,
          meta.country,
          meta.contentType,
          0.5,   // placeholder — classifier will update with final confidence
          [],    // entities not yet available at this stage
        );
      }

      // Push to classifier
      const payload: ClassifierJobPayload = {
        jobId,
        url,
        storagePath,
        mediaId,
        caption:     meta.caption,
        description: meta.description,
        creator:     meta.creator,
        country:     meta.country,
        countryCode: meta.countryCode,
        contentType: meta.contentType,
        platform:    meta.platform,
        chapters:    meta.chapters,
        tags:        meta.tags,
      };

      await this.classifierQueue.add(JOBS.CLASSIFIER, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      this.logger.log(`[${jobId}] Metadata done → classifier queued`);

    } catch (err) {
      this.logger.error(`[${jobId}] Metadata failed: ${err.message}`);
      throw err;
    }
  }
}
