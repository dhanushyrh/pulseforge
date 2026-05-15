// apps/worker-summary/src/summary.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Intelligence } from '@app/database';

interface SummaryResult {
  summary:   string;
  sentiment: 'positive' | 'neutral' | 'negative';
  entities:  string[];
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Intelligence)
    private readonly intelligenceRepo: Repository<Intelligence>,
  ) {}

  async summarize(
    jobId:        string,
    transcriptId: string,
    rawText:      string,
  ): Promise<void> {
    this.logger.log(`[${jobId}] Generating summary`);

    const { summary, sentiment, entities } = await this.extractInsights(jobId, rawText);

    // Update Intelligence record
    await this.intelligenceRepo.update(
      { jobId },
      { summary, sentiment, entities },
    );

    // Mark job complete
    await this.jobRepo.update({ id: jobId }, { status: 'completed' });
    this.logger.log(`[${jobId}] Summary done → job completed`);
  }

  // ── Insight Extraction ───────────────────────────────────

  private async extractInsights(
    jobId:   string,
    rawText: string,
  ): Promise<SummaryResult> {
    const excerpt = rawText.slice(0, 3000);

    const prompt = `
You are an AI that summarizes social media video transcripts.
Given the transcript below, return a JSON object with exactly these fields:
- summary: 2-3 sentence summary of the content
- sentiment: one of "positive", "neutral", or "negative"
- entities: array of up to 10 key topics, people, or brands mentioned

Transcript:
${excerpt}

Respond ONLY with valid JSON. No markdown, no code blocks, no explanation.
    `.trim();

    try {
      const res = await fetch('http://localhost:8001/summarize', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error(`Sidecar returned ${res.status}`);

      // Read body ONCE only
      const data = await res.json() as SummaryResult;

      return {
        summary:   data.summary   ?? this.fallbackSummary(rawText),
        sentiment: data.sentiment ?? 'neutral',
        entities:  data.entities  ?? [],
      };

    } catch (err) {
      // Sidecar not available — use fallback
      this.logger.warn(`[${jobId}] Summary sidecar unavailable, using fallback: ${err.message}`);
      return this.fallback(rawText);
    }
  }

  // ── Fallback (no sidecar needed) ─────────────────────────

  private fallback(rawText: string): SummaryResult {
    return {
      summary:   this.fallbackSummary(rawText),
      sentiment: 'neutral',
      entities:  [],
    };
  }

  private fallbackSummary(rawText: string): string {
    // Simple extractive summary — first 200 chars cleaned up
    return rawText
      .slice(0, 200)
      .replace(/\s+/g, ' ')
      .trim()
      .concat('...');
  }
}