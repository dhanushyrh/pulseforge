// apps/worker-classifier/src/classifier.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '@app/queue';
import type { ClassifierJobPayload, TranscriptJobPayload } from '@app/queue';
import { ClassifierService } from './classifier.service';

@Processor(QUEUES.CLASSIFIER, { concurrency: 2 })
export class ClassifierProcessor extends WorkerHost {
  private readonly logger = new Logger(ClassifierProcessor.name);

  constructor(
    private readonly classifierService: ClassifierService,
    @InjectQueue(QUEUES.TRANSCRIPT)
    private readonly transcriptQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ClassifierJobPayload>): Promise<void> {
    const { jobId, storagePath, mediaId } = job.data;
    this.logger.log(`[${jobId}] Classifying content`);

    try {
      // Run classification
      const result = await this.classifierService.classify(job.data);

      // Always persist result
      await this.classifierService.persistResult(jobId, result);

      if (!result.isTravel) {
        // ── Gate: not travel → stop pipeline ──────────────
        await this.classifierService.updateJobStatus(jobId, 'not_travel');
        this.logger.log(
          `[${jobId}] Not travel (${Math.round(result.confidence * 100)}%) ` +
          `→ pipeline stopped. Reason: ${result.reason}`
        );
        return;   // no further queue pushes
      }

      // ── Travel confirmed → continue to transcript ───────
      this.logger.log(
        `[${jobId}] Travel confirmed (${Math.round(result.confidence * 100)}%) ` +
        `→ transcript queued`
      );

      const payload: TranscriptJobPayload = {
        jobId, mediaId, storagePath,
        url:         job.data.url,
        chapters:    job.data.chapters    ?? [],
        tags:        job.data.tags        ?? [],
        caption:     job.data.caption     ?? null,
        description: job.data.description ?? null,
        creator:     job.data.creator     ?? null,
        country:     job.data.country     ?? null,
        countryCode: job.data.countryCode ?? null,
        contentType: job.data.contentType,
      };
      await this.transcriptQueue.add(JOBS.TRANSCRIPT, payload, {
        attempts: 3,
        backoff:  { type: 'exponential', delay: 3000 },
      });

    } catch (err) {
      this.logger.error(`[${jobId}] Classifier failed: ${err.message}`);
      await this.classifierService.updateJobStatus(jobId, 'failed');
      throw err;
    }
  }
}