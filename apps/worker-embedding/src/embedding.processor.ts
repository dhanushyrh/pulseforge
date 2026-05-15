// apps/worker-embedding/src/embedding.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '@app/queue';
import type { EmbeddingJobPayload } from '@app/queue';
import { EmbeddingService } from './embedding.service';

@Processor(QUEUES.EMBEDDING, { concurrency: 1 })
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly embeddingService: EmbeddingService) {
    super();
  }

  async process(job: Job<EmbeddingJobPayload>): Promise<void> {
    const { jobId, transcriptId, rawText } = job.data;
    this.logger.log(`[${jobId}] Starting embedding`);

    try {
      await this.embeddingService.embedAndStore(jobId, transcriptId, rawText);
      this.logger.log(`[${jobId}] Embedding complete`);

    } catch (err) {
      this.logger.error(`[${jobId}] Embedding failed: ${err.message}`);
      throw err;
    }
  }
}