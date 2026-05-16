// apps/gateway/src/ingest/ingest.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import type { Queue } from 'bullmq';
import { Job, IngestUsage } from '@app/database';
import { QUEUES, MediaJobPayload, JOBS } from '@app/queue';
import { CreateIngestDto } from './dto/create-ingest.dto';
import type { JwtUser } from '../auth/auth.service';

const PLAN_LIMITS: Record<string, number> = {
  free:  5,
  pro:   50,
  admin: Infinity,
};

@Injectable()
export class IngestService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,

    @InjectRepository(IngestUsage)
    private readonly usageRepo: Repository<IngestUsage>,

    @InjectQueue(QUEUES.MEDIA)
    private readonly mediaQueue: Queue,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  async checkRateLimit(userId: string, plan: string): Promise<void> {
    const date = this.today();
    const usage = await this.usageRepo.findOne({ where: { userId, date } });
    const currentCount = usage?.count ?? 0;
    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    if (currentCount >= limit) {
      throw new HttpException(
        `Daily ingest limit reached. Plan: ${plan}, limit: ${limit}/day`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async incrementUsage(userId: string): Promise<number> {
    const date = this.today();
    await this.usageRepo.query(
      `INSERT INTO ingest_usage ("userId", date, count, "createdAt", "updatedAt")
       VALUES ($1, $2, 1, now(), now())
       ON CONFLICT ("userId", date)
       DO UPDATE SET count = ingest_usage.count + 1, "updatedAt" = now()`,
      [userId, date],
    );
    const usage = await this.usageRepo.findOne({ where: { userId, date } });
    return usage?.count ?? 1;
  }

  async createJob(dto: CreateIngestDto, user: JwtUser) {
    await this.checkRateLimit(user.userId, user.plan);

    const job = this.jobRepo.create({
      url:              dto.url,
      priority:         dto.priority ?? 'low',
      metadataOverride: dto.metadata_override ?? {},
      status:           'pending',
    });
    await this.jobRepo.save(job);

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

    job.status = 'queued';
    await this.jobRepo.save(job);

    const newCount = await this.incrementUsage(user.userId);
    const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.free;

    return {
      jobId:         job.id,
      status:        'queued',
      estimatedTime: dto.priority === 'high' ? '30s' : '120s',
      usage: {
        today:     newCount,
        limit:     limit === Infinity ? -1 : limit,
        remaining: limit === Infinity ? -1 : Math.max(0, limit - newCount),
      },
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;
    return { jobId: job.id, status: job.status, updatedAt: job.updatedAt };
  }

  async getUsage(userId: string, plan: string) {
    const date = this.today();
    const usage = await this.usageRepo.findOne({ where: { userId, date } });
    const today = usage?.count ?? 0;
    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);

    return {
      plan,
      today,
      limit:     limit === Infinity ? -1 : limit,
      remaining: limit === Infinity ? -1 : Math.max(0, limit - today),
      resetAt:   midnight.toISOString(),
    };
  }
}
