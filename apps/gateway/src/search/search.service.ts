// apps/gateway/src/search/search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { SearchDto } from './dto/search.dto';

const COLLECTION = 'pulse_memory';
interface QdrantPayload {
  job_id?:          string;
  text_chunk?:      string;
  timestamp_start?: number;
  metadata?: {
    platform?: string;
    creator?:  string;
    duration_seconds?: number;
  };
}
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly qdrant: QdrantClient;

  constructor() {
    this.qdrant = new QdrantClient({
      host: process.env.QDRANT_HOST || 'localhost',
      port: parseInt(process.env.QDRANT_PORT ?? '6333', 10),
    });
  }

  async search(dto: SearchDto) {
    // Embed the query using the Python sidecar (HTTP call to local embedding server)
    const vector = await this.getQueryEmbedding(dto.query);

    // Build Qdrant filter from dto.filters
    const filter = this.buildFilter(dto.filters);

    const results = await this.qdrant.search(COLLECTION, {
      vector,
      limit:        dto.limit ?? 5,
      filter,
      with_payload: true,
    });

    return {
  query:   dto.query,
  results: results.map(r => {
    const p = r.payload as QdrantPayload;   // ← cast here
    return {
      score:     r.score,
      chunk:     p?.text_chunk,
      jobId:     p?.job_id,
      timestamp: p?.timestamp_start,
      platform:  p?.metadata?.platform,
      creator:   p?.metadata?.creator,
    };
  }),
};
  }

  private async getQueryEmbedding(text: string): Promise<number[]> {
    // Calls the local Python embedding sidecar (we'll build this in Phase 5)
    const res = await fetch('http://localhost:8001/embed', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    const data = await res.json() as { embedding: number[] };
    return data.embedding;
  }

  private buildFilter(filters?: SearchDto['filters']) {
    if (!filters) return undefined;
    const must: any[] = [];

    if (filters.platform) {
      must.push({ key: 'metadata.platform', match: { value: filters.platform } });
    }
    if (filters.min_duration) {
      must.push({ key: 'metadata.duration_seconds', range: { gte: filters.min_duration } });
    }
    return must.length ? { must } : undefined;
  }
}