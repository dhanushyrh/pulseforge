// apps/worker-embedding/src/embedding.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { Job } from '@app/database';

const COLLECTION    = 'pulse_memory';
const VECTOR_SIZE   = 384;
const CHUNK_SIZE    = 500;
const CHUNK_OVERLAP = 50;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly qdrant: QdrantClient;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {
    this.qdrant = new QdrantClient({
      host: process.env.QDRANT_HOST ?? 'localhost',
      port: parseInt(process.env.QDRANT_PORT ?? '6333', 10),
    });
  }

  async ensureCollection() {
    const collections = await this.qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION);
    if (!exists) {
      await this.qdrant.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
      });
      this.logger.log(`Created Qdrant collection: ${COLLECTION}`);
    }

    const indexFields: Array<{ name: string; schema: 'keyword' | 'bool' }> = [
      { name: 'user_id',    schema: 'keyword' },
      { name: 'chunk_type', schema: 'keyword' },
      { name: 'country',    schema: 'keyword' },
      { name: 'creator',    schema: 'keyword' },
      { name: 'is_travel',  schema: 'bool' },
    ];

    for (const { name, schema } of indexFields) {
      try {
        await this.qdrant.createPayloadIndex(COLLECTION, {
          field_name:   name,
          field_schema: schema,
        });
      } catch {
        // idempotent — index already exists
      }
    }
  }

  async embedAndStore(
    jobId:       string,
    transcriptId: string,
    rawText:     string,
    userId:      string,
    caption:     string | null,
    description: string | null,
    country:     string | null,
    countryCode: string | null,
    platform:    string,
    contentType: string,
    creator:     string | null,
  ) {
    await this.ensureCollection();

    const basePayload = {
      job_id:       jobId,
      user_id:      userId,
      country:      country      ?? null,
      country_code: countryCode  ?? null,
      creator:      creator      ?? null,
      platform,
      content_type: contentType,
      is_travel:    true,
    };

    const points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }> = [];

    // ── Caption (single point) ──────────────────────────────
    if (caption && caption.length > 0) {
      const vector = await this.getEmbedding(caption);
      points.push({
        id: uuidv4(),
        vector,
        payload: {
          ...basePayload,
          chunk_type:  'caption',
          text_chunk:  caption,
          chunk_index: 0,
        },
      });
    }

    // ── Description (single point, first 1000 chars) ────────
    if (description && description.length > 10) {
      const vector = await this.getEmbedding(description.slice(0, 1000));
      points.push({
        id: uuidv4(),
        vector,
        payload: {
          ...basePayload,
          chunk_type:  'description',
          text_chunk:  description.slice(0, 1000),
          chunk_index: 0,
        },
      });
    }

    // ── Transcript chunks ───────────────────────────────────
    const chunks = this.chunkText(rawText);
    this.logger.log(`[${jobId}] Embedding ${chunks.length} transcript chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const vector = await this.getEmbedding(chunks[i].text);
      points.push({
        id: uuidv4(),
        vector,
        payload: {
          ...basePayload,
          chunk_type:      'transcript',
          text_chunk:      chunks[i].text,
          chunk_index:     i,
          timestamp_start: chunks[i].charStart,
        },
      });
    }

    // ── Upsert in batches of 100 ────────────────────────────
    for (let i = 0; i < points.length; i += 100) {
      await this.qdrant.upsert(COLLECTION, {
        wait:   true,
        points: points.slice(i, i + 100),
      });
    }

    this.logger.log(`[${jobId}] Upserted ${points.length} vectors (caption + description + transcript)`);
  }

  async updateJobStatus(jobId: string, status: string) {
    await this.jobRepo.update({ id: jobId }, { status });
  }

  private chunkText(text: string): { text: string; charStart: number }[] {
    const chunks: { text: string; charStart: number }[] = [];
    let start = 0;
    while (start < text.length) {
      const end   = Math.min(start + CHUNK_SIZE, text.length);
      const chunk = text.slice(start, end).trim();
      if (chunk) chunks.push({ text: chunk, charStart: start });
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks;
  }

  private async getEmbedding(text: string): Promise<number[]> {
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
