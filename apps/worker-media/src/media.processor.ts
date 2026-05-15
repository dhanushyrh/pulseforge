// apps/worker-media/src/media.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '@app/queue';
import type { MediaJobPayload, TranscriptJobPayload } from '@app/queue';
import { MediaService } from './media.service';

@Processor(QUEUES.MEDIA, { concurrency: 1 })
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name);

  constructor(
    private readonly mediaService: MediaService,
    @InjectQueue(QUEUES.TRANSCRIPT)
    private readonly transcriptQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<MediaJobPayload>): Promise<void> {
    const { jobId, url } = job.data;
    this.logger.log(`[${jobId}] Starting media download`);

    try {
      await this.mediaService.updateJobStatus(jobId, 'processing');
      await this.mediaService.ensureBucket();

      const { mediaId, storagePath } = await this.mediaService.downloadAndUpload(jobId, url);

      const payload: TranscriptJobPayload = { jobId, mediaId, storagePath };
      await this.transcriptQueue.add(JOBS.TRANSCRIPT, payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      });

      this.logger.log(`[${jobId}] Media done → transcript queued`);

    } catch (err) {
      this.logger.error(`[${jobId}] Media failed: ${err.message}`);
      await this.mediaService.updateJobStatus(jobId, 'failed');
      throw err;
    }
  }
}