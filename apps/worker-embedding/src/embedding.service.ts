// apps/worker-embedding/src/embedding.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { Job } from '@app/database';

const COLLECTION     = 'pulse_memory';
const VECTOR_SIZE    = 384;   // all-MiniLM-L6-v2 output dim
const CHUNK_SIZE     = 500;   // characters per chunk
const CHUNK_OVERLAP  = 50;

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
  }

  async embedAndStore(jobId: string, transcriptId: string, rawText: string) {
    await this.ensureCollection();

    const chunks  = this.chunkText(rawText);
    this.logger.log(`[${jobId}] Embedding ${chunks.length} chunks`);

    const points = await Promise.all(
      chunks.map(async (chunk, i) => {
        const vector = await this.getEmbedding(chunk.text);
        return {
          id:      uuidv4(),
          vector,
          payload: {
            job_id:          jobId,
            transcript_id:   transcriptId,
            text_chunk:      chunk.text,
            chunk_index:     i,
            timestamp_start: chunk.charStart,
            metadata: {
              platform: await this.getJobPlatform(jobId),
            },
          },
        };
      })
    );

    // Upsert in batches of 100
    for (let i = 0; i < points.length; i += 100) {
      await this.qdrant.upsert(COLLECTION, {
        wait:   true,
        points: points.slice(i, i + 100),
      });
    }

    this.logger.log(`[${jobId}] Upserted ${points.length} vectors to Qdrant`);
  }

  async updateJobStatus(jobId: string, status: string) {
    await this.jobRepo.update({ id: jobId }, { status });
  }

  private chunkText(text: string): { text: string; charStart: number }[] {
    const chunks: { text: string; charStart: number }[] = [];
    let start = 0;
    while (start < text.length) {
      const end     = Math.min(start + CHUNK_SIZE, text.length);
      const chunk   = text.slice(start, end).trim();
      if (chunk) chunks.push({ text: chunk, charStart: start });
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks;
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const res  = await fetch('http://localhost:8001/embed', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    const data = await res.json() as { embedding: number[] };
    return data.embedding;
  }

  private async getJobPlatform(jobId: string): Promise<string> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return 'other';
    const url = job.url;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'other';
  }
}