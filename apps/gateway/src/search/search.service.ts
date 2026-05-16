// apps/gateway/src/search/search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { QdrantClient } from '@qdrant/js-client-rest';
import { Job, Intelligence, ContentInsights } from '@app/database';
import { SearchDto } from './dto/search.dto';

const COLLECTION = 'pulse_memory';

interface QdrantPayload {
  job_id?:     string;
  user_id?:    string;
  chunk_type?: string;
  text_chunk?: string;
  country?:    string;
  creator?:    string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly qdrant: QdrantClient;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Intelligence)
    private readonly intelRepo: Repository<Intelligence>,
    @InjectRepository(ContentInsights)
    private readonly insightsRepo: Repository<ContentInsights>,
  ) {
    this.qdrant = new QdrantClient({
      host: process.env.QDRANT_HOST ?? 'localhost',
      port: parseInt(process.env.QDRANT_PORT ?? '6333', 10),
    });
  }

  async search(dto: SearchDto, userId: string) {
    const vector = await this.getQueryEmbedding(dto.query);

    // ── Build filter ────────────────────────────────────────
    const must: any[] = [
      { key: 'user_id', match: { value: userId } },
    ];

    if (dto.filters?.country) {
      must.push({ key: 'country', match: { value: dto.filters.country } });
    }
    if (dto.filters?.creator) {
      must.push({ key: 'creator', match: { value: dto.filters.creator } });
    }
    if (dto.filters?.contentType) {
      must.push({ key: 'content_type', match: { value: dto.filters.contentType } });
    }
    if (dto.filters?.chunkType) {
      must.push({ key: 'chunk_type', match: { value: dto.filters.chunkType } });
    }

    // ── Qdrant search (fetch 3× limit to allow dedup headroom) ─
    const limit = dto.limit ?? 5;
    let rawResults: any[] = [];
    try {
      rawResults = await this.qdrant.search(COLLECTION, {
        vector,
        limit:          limit * 3,
        filter:         { must },
        with_payload:   true,
        score_threshold: dto.scoreThreshold ?? 0.3,
      });
    } catch (err) {
      this.logger.warn(`Qdrant search error: ${err.message}`);
      return { query: dto.query, total: 0, results: [] };
    }

    // ── Chunk-type score weighting ──────────────────────────
    const weighted = rawResults.map(r => {
      const p    = r.payload as QdrantPayload;
      let score  = r.score;
      if (p.chunk_type === 'caption')     score *= 1.3;
      if (p.chunk_type === 'description') score *= 1.1;
      return { score, payload: p, excerpt: p.text_chunk ?? '' };
    });

    // ── Deduplicate by jobId, keep highest score ────────────
    const jobMap: Record<string, { score: number; payload: QdrantPayload; excerpt: string }> = {};
    for (const r of weighted) {
      const jobId = r.payload.job_id;
      if (!jobId) continue;
      if (!jobMap[jobId] || r.score > jobMap[jobId].score) {
        jobMap[jobId] = r;
      }
    }

    const top = Object.entries(jobMap)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, limit);

    if (top.length === 0) {
      return { query: dto.query, total: 0, results: [] };
    }

    const jobIds = top.map(([jobId]) => jobId);

    // ── Enrich from Postgres ────────────────────────────────
    const [jobs, intels, insights] = await Promise.all([
      this.jobRepo.find({ where: { id: In(jobIds) } }),
      this.intelRepo.find({ where: { jobId: In(jobIds) } }),
      this.insightsRepo.find({ where: { jobId: In(jobIds) } }),
    ]);

    const jobById     = Object.fromEntries(jobs.map(j  => [j.id,     j]));
    const intelById   = Object.fromEntries(intels.map(i => [i.jobId,  i]));
    const insightById = Object.fromEntries(insights.map(s => [s.jobId, s]));

    const results = top.map(([jobId, r]) => {
      const job     = jobById[jobId];
      const intel   = intelById[jobId];
      const insight = insightById[jobId];

      if (!job) return null;

      return {
        score:            Math.round(r.score * 100) / 100,
        matchExcerpt:     r.excerpt,
        chunkType:        r.payload.chunk_type ?? null,
        jobId:            job.id,
        url:              job.url,
        platform:         job.platform,
        contentType:      job.contentType,
        country:          job.country,
        countryCode:      job.countryCode,
        creator:          job.creator,
        caption:          job.caption,
        isTravel:         job.isTravel,
        travelConfidence: job.travelConfidence,
        summary:          intel?.summary   ?? null,
        sentiment:        intel?.sentiment ?? null,
        entities:         intel?.entities  ?? [],
        insightsPreview: {
          hasItinerary: insight?.hasItinerary                ?? false,
          stayCount:    insight?.stays?.length               ?? 0,
          placeCount:   insight?.places?.length              ?? 0,
          foodCount:    insight?.food?.length                ?? 0,
          hasBudget:    (insight?.budget?.length ?? 0) > 0,
          currency:     insight?.currency                    ?? null,
        },
      };
    }).filter(Boolean);

    return { query: dto.query, total: results.length, results };
  }

  private async getQueryEmbedding(text: string): Promise<number[]> {
    const url = process.env.EMBEDDING_SIDECAR_URL ?? 'http://localhost:8001';
    const res  = await fetch(`${url}/embed`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    const data = await res.json() as { embedding: number[] };
    return data.embedding;
  }
}
