// apps/worker-insights/src/insights.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '@app/queue';
import type { InsightsJobPayload } from '@app/queue';
import { InsightsService } from './insights.service';

@Processor(QUEUES.INSIGHTS, { concurrency: 1 })
export class InsightsProcessor extends WorkerHost {
  private readonly logger = new Logger(InsightsProcessor.name);

  constructor(private readonly insightsService: InsightsService) {
    super();
  }

  async process(job: Job<InsightsJobPayload>): Promise<void> {
    const { jobId, rawText, country, contentType, chapters, tags, caption, creator } = job.data;
    this.logger.log(`[${jobId}] Starting insights extraction`);

    try {
      await this.insightsService.extract(
        jobId, rawText, country, contentType,
        chapters ?? [], tags ?? [], caption ?? null, creator ?? null,
      );
      this.logger.log(`[${jobId}] Insights complete`);
    } catch (err) {
      this.logger.error(`[${jobId}] Insights failed: ${err.message}`);
      throw err;
    }
  }
}