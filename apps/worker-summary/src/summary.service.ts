// apps/worker-summary/src/summary.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { Job, Intelligence } from '@app/database';
import type { VideoChapter } from '@app/queue';

interface SummaryResult {
  summary:   string;
  sentiment: 'positive' | 'neutral' | 'negative';
  entities:  string[];
}

@Injectable()
export class SummaryService {
  private readonly logger    = new Logger(SummaryService.name);
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Intelligence)
    private readonly intelligenceRepo: Repository<Intelligence>,
  ) {}

  async summarize(
    jobId:       string,
    rawText:     string,
    chapters:     VideoChapter[],
    tags:         string[],
    caption:      string | null,
    creator:      string | null,
    country:      string | null,
    contentType:  string,
  ): Promise<void> {
    this.logger.log(`[${jobId}] Generating summary`);
    const { summary, sentiment, entities } = await this.extractInsights(
      jobId, rawText, chapters, tags, caption, creator, country, contentType,
    );

    await this.intelligenceRepo.update({ jobId }, { summary, sentiment, entities });
    await this.jobRepo.update({ id: jobId }, { status: 'completed' });
    this.logger.log(`[${jobId}] Summary done → job completed`);
  }

  private async extractInsights(
    jobId:       string,
    rawText:     string,
    chapters:    VideoChapter[],
    tags:        string[],
    caption:     string | null,
    creator:     string | null,
    country:     string | null,
    contentType: string,
  ): Promise<SummaryResult> {
    const chapterContext = chapters.length
      ? `\nChapters: ${chapters.map(c => c.title).join(' · ')}`
      : '';
    const tagContext = tags.length
      ? `\nTags: ${tags.slice(0, 10).join(', ')}`
      : '';

    const prompt = `You are a travel content analyst. Summarize this ${contentType} video and extract key topics.

Context:
- Creator: ${creator ?? 'unknown'}
- Country/destination: ${country ?? 'unknown'}
- Title/caption: ${caption ?? 'unknown'}${chapterContext}${tagContext}

Transcript:
${rawText.slice(0, 3500)}

Return ONLY valid JSON with exactly these fields:
{
  "summary": "2-3 sentences covering the destination, what the creator did, and key highlights",
  "sentiment": "positive" or "neutral" or "negative",
  "entities": ["up to 10 key places, foods, activities, or brands mentioned"]
}`;

    try {
      const completion = await this.groq.chat.completions.create({
        model:           'llama-3.1-8b-instant',
        temperature:     0,
        response_format: { type: 'json_object' },
        messages:        [{ role: 'user', content: prompt }],
      });

      const raw = (completion.choices[0].message.content ?? '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in response');

      const data = JSON.parse(match[0]) as SummaryResult;
      return {
        summary:   data.summary   ?? this.fallbackSummary(rawText),
        sentiment: data.sentiment ?? 'neutral',
        entities:  Array.isArray(data.entities) ? data.entities : [],
      };

    } catch (err) {
      this.logger.warn(`[${jobId}] Gemini summary failed: ${err.message} — using fallback`);
      return { summary: this.fallbackSummary(rawText), sentiment: 'neutral', entities: [] };
    }
  }

  private fallbackSummary(rawText: string): string {
    return rawText.slice(0, 200).replace(/\s+/g, ' ').trim() + '...';
  }
}
