// apps/gateway/src/content/content.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Intelligence, ContentInsights } from '@app/database';
import { ContentQueryDto } from './dto/content-query.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(ContentInsights)
    private readonly insightsRepo: Repository<ContentInsights>,
    @InjectRepository(Intelligence)
    private readonly intelRepo: Repository<Intelligence>,
  ) {}

  // ── List with filters + pagination ───────────────────────
  async findAll(dto: ContentQueryDto) {
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .orderBy('job.createdAt', 'DESC');

    if (dto.country) {
      qb.andWhere('LOWER(job.country) = LOWER(:country)', { country: dto.country });
    }
    if (dto.countryCode) {
      qb.andWhere('LOWER(job.countryCode) = LOWER(:countryCode)', { countryCode: dto.countryCode });
    }
    if (dto.contentType) {
      qb.andWhere('job.contentType = :contentType', { contentType: dto.contentType });
    }
    if (dto.status) {
      qb.andWhere('job.status = :status', { status: dto.status });
    }
    if (dto.search) {
      qb.andWhere(
        '(LOWER(job.caption) LIKE :s OR LOWER(job.creator) LIKE :s OR LOWER(job.description) LIKE :s)',
        { s: `%${dto.search.toLowerCase()}%` }
      );
    }

    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(this.formatItem),
      total,
      page,
      limit,
    };
  }

  // ── Single item with intelligence joined ─────────────────
  async findOne(jobId: string) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;

    const intel = await this.intelRepo.findOne({ where: { jobId } });

    return {
      ...this.formatItem(job),
      summary:   intel?.summary   ?? null,
      sentiment: intel?.sentiment ?? null,
      entities:  intel?.entities  ?? [],
      rawText:   undefined,   // never expose raw transcript via API
    };
  }

  // ── Stats ────────────────────────────────────────────────
  async getStats() {
    const [total, travel, notTravel, processing] = await Promise.all([
      this.jobRepo.count(),
      this.jobRepo.count({ where: { isTravel: true } }),
      this.jobRepo.count({ where: { status: 'not_travel' } }),
      this.jobRepo.count({ where: { status: 'processing' } }),
    ]);

    const countriesResult = await this.jobRepo
      .createQueryBuilder('job')
      .select('COUNT(DISTINCT job.country)', 'count')
      .where('job.country IS NOT NULL')
      .getRawOne();

    return {
      total,
      travel,
      notTravel,
      processing,
      countries: parseInt(countriesResult?.count ?? '0', 10),
    };
  }

  // ── Countries with counts ────────────────────────────────
  async getCountries() {
    const rows = await this.jobRepo
      .createQueryBuilder('job')
      .select('job.country',     'country')
      .addSelect('job.countryCode', 'countryCode')
      .addSelect('COUNT(*)',      'count')
      .where('job.country IS NOT NULL')
      .andWhere('job.isTravel = true')
      .groupBy('job.country')
      .addGroupBy('job.countryCode')
      .orderBy('count', 'DESC')
      .getRawMany();

    return rows.map(r => ({
      country:     r.country,
      countryCode: r.countryCode ?? '',
      count:       parseInt(r.count, 10),
    }));
  }

  // ── Content types with counts ────────────────────────────
  async getTypes() {
    const rows = await this.jobRepo
      .createQueryBuilder('job')
      .select('job.contentType', 'contentType')
      .addSelect('COUNT(*)',      'count')
      .where('job.contentType IS NOT NULL')
      .andWhere('job.isTravel = true')
      .groupBy('job.contentType')
      .orderBy('count', 'DESC')
      .getRawMany();

    return rows.map(r => ({
      contentType: r.contentType,
      count:       parseInt(r.count, 10),
    }));
  }

  async getInsights(jobId: string) {
    const insights = await this.insightsRepo.findOne({ where: { jobId } });
    if (!insights) return null;
    return {
      jobId:             insights.jobId,
      stays:             insights.stays           ?? [],
      places:            insights.places          ?? [],
      food:              insights.food            ?? [],
      budget:            insights.budget          ?? [],
      itinerary:         insights.itinerary       ?? [],
      itineraryItems:    insights.itineraryItems  ?? [],
      currency:          insights.currency        ?? null,
      hasItinerary:      insights.hasItinerary    ?? false,
      totalBudgetPerDay: insights.totalBudgetPerDay ?? 0,
    };
  }

async getCreators() {
  const rows = await this.jobRepo
    .createQueryBuilder('job')
    .select('job.creator',                  'creator')
    .addSelect('COUNT(*)',                   'count')
    .addSelect('AVG(job.travelConfidence)',  'avgConfidence')
    .addSelect('array_agg(DISTINCT job.country) FILTER (WHERE job.country IS NOT NULL)', 'countries')
    .addSelect('array_agg(DISTINCT job.contentType) FILTER (WHERE job.contentType IS NOT NULL)', 'contentTypes')
    .where('job.creator IS NOT NULL')
    .andWhere('job.isTravel = true')
    .groupBy('job.creator')
    .orderBy('count', 'DESC')
    .getRawMany();

  return rows.map(r => ({
    creator:      r.creator,
    count:        parseInt(r.count, 10),
    avgConfidence: parseFloat(parseFloat(r.avgConfidence ?? '0').toFixed(2)),
    countries:    r.countries   ?? [],
    contentTypes: r.contentTypes ?? [],
  }));
}

  // ── Format helper ────────────────────────────────────────
  private formatItem(job: Job) {
    return {
      jobId:            job.id,
      url:              job.url,
      status:           job.status,
      platform:         job.platform         ?? null,
      contentType:      job.contentType      ?? 'unknown',
      country:          job.country          ?? null,
      countryCode:      job.countryCode      ?? null,
      creator:          job.creator          ?? null,
      caption:          job.caption          ?? null,
      description:      job.description      ?? null,
      isTravel:         job.isTravel         ?? false,
      travelConfidence: job.travelConfidence ?? 0,
      classifiedAt:     job.classifiedAt     ?? null,
      createdAt:        job.createdAt,
      updatedAt:        job.updatedAt,
    };
  }
}