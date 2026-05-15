// apps/worker-summary/src/summary.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '@app/queue';
import type { SummaryJobPayload } from '@app/queue';
import { SummaryService } from './summary.service';

@Processor(QUEUES.SUMMARY, { concurrency: 1 })
export class SummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(SummaryProcessor.name);

  constructor(private readonly summaryService: SummaryService) {
    super();
  }

  async process(job: Job<SummaryJobPayload>): Promise<void> {
    const { jobId, transcriptId, rawText } = job.data;
    this.logger.log(`[${jobId}] Starting summary`);

    try {
      await this.summaryService.summarize(jobId, transcriptId, rawText);
      this.logger.log(`[${jobId}] Summary complete`);

    } catch (err) {
      this.logger.error(`[${jobId}] Summary failed: ${err.message}`);
      throw err;
    }
  }
}