// apps/worker-embedding/src/embedding.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUES } from '@app/queue';
import type { EmbeddingJobPayload } from '@app/queue';
import { Job as JobEntity } from '@app/database';
import { EmbeddingService } from './embedding.service';

@Processor(QUEUES.EMBEDDING, { concurrency: 1 })
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
  ) {
    super();
  }

  async process(job: Job<EmbeddingJobPayload>): Promise<void> {
    const { jobId, transcriptId, rawText, userId, caption, description, countryCode, contentType, creator } = job.data;
    this.logger.log(`[${jobId}] Starting embedding`);

    try {
      // Fetch platform and country from DB — not in EmbeddingJobPayload
      const jobRecord = await this.jobRepo.findOne({ where: { id: jobId } });
      const platform  = jobRecord?.platform  ?? 'other';
      const country   = jobRecord?.country   ?? null;

      await this.embeddingService.embedAndStore(
        jobId,
        transcriptId,
        rawText,
        userId,
        caption     ?? null,
        description ?? null,
        country,
        countryCode ?? null,
        platform,
        contentType ?? 'vlog',
        creator     ?? null,
      );

      await this.embeddingService.updateJobStatus(jobId, 'completed');
      this.logger.log(`[${jobId}] Embedding complete`);

    } catch (err) {
      this.logger.error(`[${jobId}] Embedding failed: ${err.message}`);
      throw err;
    }
  }
}
