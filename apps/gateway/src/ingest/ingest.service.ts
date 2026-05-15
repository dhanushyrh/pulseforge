// apps/gateway/src/ingest/ingest.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import type { Queue } from 'bullmq'; 
import { Job } from '@app/database';
import { QUEUES, MediaJobPayload, JOBS } from '@app/queue';
import { CreateIngestDto } from './dto/create-ingest.dto';

@Injectable()
export class IngestService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectQueue(QUEUES.MEDIA)
    private readonly mediaQueue: Queue,
  ) {}

  async createJob(dto: CreateIngestDto) {
    // 1. Persist job record (status: pending)
    const job = this.jobRepo.create({
      url:              dto.url,
      priority:         dto.priority ?? 'low',
      metadataOverride: dto.metadata_override ?? {},
      status:           'pending',
    });
    await this.jobRepo.save(job);

    // 2. Push to media queue — kicks off the worker pipeline
    const payload: MediaJobPayload = {
      jobId:    job.id,
      url:      dto.url,
      priority: dto.priority ?? 'low',
    };

    await this.mediaQueue.add(JOBS.MEDIA, payload, {
      priority: dto.priority === 'high' ? 1 : 10,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: false,
      removeOnFail:     false,
    });

    // 3. Update status → queued
    job.status = 'queued';
    await this.jobRepo.save(job);

    return {
      jobId:         job.id,
      status:        'queued',
      estimatedTime: dto.priority === 'high' ? '30s' : '120s',
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    return { jobId: job.id, status: job.status, updatedAt: job.updatedAt };
  }
}