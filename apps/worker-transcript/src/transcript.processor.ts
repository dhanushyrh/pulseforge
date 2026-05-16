// apps/worker-transcript/src/transcript.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { QUEUES, JOBS } from '@app/queue';
import type { TranscriptJobPayload, EmbeddingJobPayload, SummaryJobPayload, InsightsJobPayload } from '@app/queue';
import { Job as JobEntity } from '@app/database';
import { TranscriptService } from './transcript.service';

@Processor(
  QUEUES.TRANSCRIPT,
  {
    concurrency: 1,
    lockDuration: 300_000,
    lockRenewTime: 60_000,
  }
)
export class TranscriptProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscriptProcessor.name);

  constructor(
    private readonly transcriptService: TranscriptService,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectQueue(QUEUES.EMBEDDING) private readonly embeddingQueue: Queue,
    @InjectQueue(QUEUES.SUMMARY)   private readonly summaryQueue:   Queue,
    @InjectQueue(QUEUES.INSIGHTS)  private readonly insightsQueue:  Queue,
  ) {
    super();
  }

  async process(job: Job<TranscriptJobPayload>): Promise<void> {
    const { jobId, storagePath, url, chapters, tags, caption, description, creator, country, countryCode, contentType } = job.data;
    this.logger.log(`[${jobId}] Starting transcription`);

    try {
      await job.extendLock(job.token!, 300_000);

      const { transcriptId, rawText } = await this.transcriptService.transcribe(
        jobId,
        storagePath,
        url,
        description ?? null,
      );

      // Fetch userId from DB — not propagated through the classifier chain
      const jobRecord = await this.jobRepo.findOne({ where: { id: jobId } });
      const userId = jobRecord?.userId ?? '';

      const embeddingPayload: EmbeddingJobPayload = {
        jobId,
        transcriptId,
        rawText,
        userId,
        caption:     caption     ?? null,
        description: description ?? null,
        countryCode: countryCode ?? null,
        contentType: contentType ?? 'vlog',
        creator:     creator     ?? null,
      };

      const summaryPayload: SummaryJobPayload = {
        jobId, transcriptId, rawText,
        chapters:    chapters    ?? [],
        tags:        tags        ?? [],
        caption:     caption     ?? null,
        creator:     creator     ?? null,
        country:     country     ?? null,
        contentType: contentType ?? 'vlog',
      };

      const insightsPayload: InsightsJobPayload = {
        jobId, transcriptId, rawText,
        country:     country     ?? null,
        contentType: contentType ?? 'vlog',
        chapters:    chapters    ?? [],
        tags:        tags        ?? [],
        caption:     caption     ?? null,
        creator:     creator     ?? null,
      };

      await Promise.all([
        this.embeddingQueue.add(JOBS.EMBEDDING, embeddingPayload, { attempts: 3 }),
        this.summaryQueue.add(JOBS.SUMMARY,     summaryPayload,   { attempts: 3 }),
        this.insightsQueue.add(JOBS.INSIGHTS,   insightsPayload,  { attempts: 3 }),
      ]);

      this.logger.log(`[${jobId}] Transcript done → embedding + summary + insights queued`);

    } catch (err) {
      this.logger.error(`[${jobId}] Transcript failed: ${err.message}`);
      await this.transcriptService.updateJobStatus(jobId, 'failed');
      throw err;
    }
  }
}
