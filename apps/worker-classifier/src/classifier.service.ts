// apps/worker-classifier/src/classifier.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { Job } from '@app/database';
import type { ClassifierJobPayload } from '@app/queue';

const STRONG_TRAVEL = [
  'travel', 'travelling', 'traveling', 'traveller', 'traveler',
  'destination', 'itinerary', 'visa', 'passport', 'airport', 'flight',
  'hotel', 'hostel', 'airbnb', 'resort', 'accommodation',
  'backpacking', 'backpacker', 'road trip', 'road-trip',
  'vacation', 'holiday', 'trip to', 'visiting', 'explore',
  'tourist', 'tourism', 'sightseeing', 'travel guide', 'travel vlog',
  'things to do in', 'best places in', 'hidden gems',
  'street food', 'food tour', 'local food', 'must try',
  'budget travel', 'solo travel', 'travel tips', 'packing',
];

const CITY_KEYWORDS = [
  'tokyo', 'osaka', 'kyoto', 'bangkok', 'bali', 'ubud', 'rome',
  'paris', 'barcelona', 'lisbon', 'amsterdam', 'prague', 'vienna',
  'istanbul', 'dubai', 'singapore', 'hanoi', 'ho chi minh',
  'siem reap', 'kathmandu', 'maldives', 'santorini', 'mykonos',
  'reykjavik', 'cape town', 'marrakech', 'mexico city', 'cancun',
  'new york', 'london', 'berlin', 'sydney', 'melbourne', 'seoul',
  'taipei', 'hong kong', 'shanghai', 'mumbai', 'delhi', 'colombo',
  'chiang mai', 'phuket', 'krabi', 'koh samui', 'florence', 'venice',
  'amalfi', 'positano', 'cinque terre', 'hallstatt', 'dubrovnik',
];

const NOT_TRAVEL = [
  'workout', 'gym', 'fitness', 'skincare', 'makeup', 'beauty routine',
  'gaming', 'minecraft', 'fortnite', 'valorant', 'relationship',
  'breakup', 'storytime', 'asmr', 'study with me', 'morning routine',
  'night routine', 'fashion haul', 'outfit', 'ootd',
];

export interface ClassificationResult {
  isTravel:   boolean;
  confidence: number;
  reason:     string;
  source:     'strong_keyword' | 'city_keyword' | 'chapter_signal' | 'not_travel_keyword' | 'llm' | 'fallback';
}

@Injectable()
export class ClassifierService {
  private readonly logger   = new Logger(ClassifierService.name);
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  async classify(payload: ClassifierJobPayload): Promise<ClassificationResult> {
    // Stage 1 — check video chapter titles (strongest signal)
    const chapterResult = this.classifyByChapters(payload.chapters ?? []);
    if (chapterResult) {
      this.logger.log(`[${payload.jobId}] Classified by chapters: ${chapterResult.isTravel} (${Math.round(chapterResult.confidence * 100)}%)`);
      return chapterResult;
    }

    const text = this.buildClassificationText(payload);

    // Stage 2 — keyword heuristic
    const heuristic = this.keywordClassify(text);

    // Use heuristic directly only when very high confidence
    if (heuristic.confidence >= 0.9) {
      this.logger.log(`[${payload.jobId}] Classified by heuristic: ${heuristic.isTravel} (${Math.round(heuristic.confidence * 100)}%)`);
      return heuristic;
    }

    // Stage 3 — Claude Haiku for everything else (any travel signal or ambiguous)
    if (heuristic.confidence >= 0.1 || heuristic.source !== 'fallback') {
      this.logger.log(`[${payload.jobId}] Sending to Claude (heuristic: ${Math.round(heuristic.confidence * 100)}%)`);
      const llmResult = await this.claudeClassify(payload.jobId, text);
      if (llmResult) return llmResult;
    }

    return heuristic;
  }

  async persistResult(jobId: string, result: ClassificationResult): Promise<void> {
    await this.jobRepo.update({ id: jobId }, {
      isTravel:         result.isTravel,
      travelConfidence: result.confidence,
      classifiedAt:     new Date(),
    });
    this.logger.log(
      `[${jobId}] Classification saved — ` +
      `isTravel: ${result.isTravel} · ` +
      `${Math.round(result.confidence * 100)}% · ` +
      `source: ${result.source}`
    );
  }

  async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.jobRepo.update({ id: jobId }, { status });
  }

  // ── Stage 1: Chapter title analysis ─────────────────────
  private classifyByChapters(
    chapters: { title: string; startTime: number; endTime: number }[],
  ): ClassificationResult | null {
    if (!chapters.length) return null;

    const chapterText = chapters.map(c => c.title).join(' ').toLowerCase();

    const notHits = NOT_TRAVEL.filter(kw => chapterText.includes(kw));
    if (notHits.length >= 2) return null; // let heuristic / LLM decide

    const strongHits = STRONG_TRAVEL.filter(kw => chapterText.includes(kw));
    const cityHits   = CITY_KEYWORDS.filter(kw => chapterText.includes(kw));

    // Chapters like "Day 1 - Tokyo" or "Where to eat in Bali"
    const dayPattern = /\bday\s*\d+\b/i.test(chapterText);

    if (dayPattern || strongHits.length >= 1 || cityHits.length >= 1) {
      const confidence = Math.min(0.75 + (strongHits.length + cityHits.length) * 0.05 + (dayPattern ? 0.1 : 0), 0.97);
      return {
        isTravel:   true,
        confidence: parseFloat(confidence.toFixed(2)),
        reason:     `Chapter titles: ${chapters.slice(0, 3).map(c => c.title).join(', ')}`,
        source:     'chapter_signal',
      };
    }

    return null;
  }

  // ── Stage 2: Keyword heuristic ───────────────────────────
  private keywordClassify(text: string): ClassificationResult {
    const lower = text.toLowerCase();

    const notHits = NOT_TRAVEL.filter(kw => lower.includes(kw));
    if (notHits.length >= 2) {
      return {
        isTravel:   false,
        confidence: 0.9,
        reason:     `Non-travel keywords: ${notHits.slice(0, 3).join(', ')}`,
        source:     'not_travel_keyword',
      };
    }

    const strongHits = STRONG_TRAVEL.filter(kw => lower.includes(kw));
    if (strongHits.length >= 1) {
      const confidence = Math.min(0.55 + strongHits.length * 0.08, 0.88);
      return {
        isTravel:   true,
        confidence: parseFloat(confidence.toFixed(2)),
        reason:     `Travel keywords: ${strongHits.slice(0, 3).join(', ')}`,
        source:     'strong_keyword',
      };
    }

    const cityHits = CITY_KEYWORDS.filter(kw => lower.includes(kw));
    if (cityHits.length >= 1) {
      const confidence = Math.min(0.5 + cityHits.length * 0.1, 0.85);
      return {
        isTravel:   true,
        confidence: parseFloat(confidence.toFixed(2)),
        reason:     `City/destination: ${cityHits.slice(0, 3).join(', ')}`,
        source:     'city_keyword',
      };
    }

    return {
      isTravel:   false,
      confidence: 0,
      reason:     'No clear travel signal',
      source:     'fallback',
    };
  }

  // ── Stage 3: Gemini Flash ────────────────────────────────
  private async claudeClassify(
    jobId: string,
    text:  string,
  ): Promise<ClassificationResult | null> {
    try {
      const completion = await this.groq.chat.completions.create({
        model:           'llama-3.1-8b-instant',
        temperature:     0,
        response_format: { type: 'json_object' },
        messages: [{
          role:    'user',
          content: `You are a travel content classifier. Determine if this social media video is travel-related.

Travel content: destination guides, travel vlogs, food tours in foreign cities, hotel reviews, flight experiences, itineraries, country/city exploration, packing tips, visa guides.
NOT travel: fitness, fashion, gaming, relationships, cooking at home, general lifestyle with no travel destination.

Text:
${text.slice(0, 1500)}

Reply ONLY with valid JSON: {"is_travel": true/false, "confidence": 0.0-1.0, "reason": "one sentence"}`,
        }],
      });

      const raw = (completion.choices[0].message.content ?? '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in response');

      const data = JSON.parse(match[0]) as {
        is_travel:  boolean;
        confidence: number;
        reason:     string;
      };

      return {
        isTravel:   Boolean(data.is_travel),
        confidence: parseFloat(Number(data.confidence).toFixed(2)),
        reason:     data.reason ?? 'Claude classification',
        source:     'llm',
      };

    } catch (err) {
      this.logger.warn(`[${jobId}] Claude classify failed: ${err.message}`);
      return null;
    }
  }

  // ── Build classification text ────────────────────────────
  private buildClassificationText(payload: ClassifierJobPayload): string {
    const parts: string[] = [];

    if (payload.caption)     parts.push(payload.caption);
    if (payload.description) parts.push(payload.description);
    if (payload.country)     parts.push(`Location: ${payload.country}`);
    if (payload.creator)     parts.push(`Creator: ${payload.creator}`);

    if (payload.tags?.length) {
      parts.push(`Tags: ${payload.tags.slice(0, 20).join(', ')}`);
    }

    return parts.join('\n\n').slice(0, 2000);
  }
}
