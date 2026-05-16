// apps/worker-insights/src/insights.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { ContentInsights, Creator, Job } from '@app/database';
import type {
  StayItem, PlaceItem, FoodItem,
  BudgetItem, ItineraryDay, ItineraryItem,
} from '@app/database';
import type { VideoChapter } from '@app/queue';

interface ExtractedInsights {
  stays:          StayItem[];
  places:         PlaceItem[];
  food:           FoodItem[];
  budget:         BudgetItem[];
  itinerary:      ItineraryDay[];
  itineraryItems: ItineraryItem[];
  currency:       string | null;
  hasItinerary:   boolean;
}

@Injectable()
export class InsightsService {
  private readonly logger    = new Logger(InsightsService.name);
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  constructor(
    @InjectRepository(ContentInsights)
    private readonly insightsRepo: Repository<ContentInsights>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Creator)
    private readonly creatorRepo: Repository<Creator>,
  ) {}

  async extract(
    jobId:       string,
    rawText:     string,
    country:     string | null,
    contentType: string,
    chapters:    VideoChapter[],
    tags:        string[],
    caption:     string | null,
    creator:     string | null,
  ): Promise<void> {
    this.logger.log(`[${jobId}] Extracting insights via Claude`);

    try {
      const data = await this.claudeExtract(rawText, country, contentType, chapters, tags, caption, creator);

      // Enrich activity + food itinerary items with Google Places
      const enriched = await this.enrichWithPlaces(jobId, data.itineraryItems, country);

      const totalBudgetPerDay = this.calcTotalBudget(data.budget);

      const existing = await this.insightsRepo.findOne({ where: { jobId } });

      const record = {
        stays:             data.stays         ?? [],
        places:            data.places        ?? [],
        food:              data.food          ?? [],
        budget:            data.budget        ?? [],
        itinerary:         data.itinerary     ?? [],
        itineraryItems:    enriched,
        currency:          data.currency      ?? undefined,
        hasItinerary:      data.hasItinerary  ?? false,
        totalBudgetPerDay,
      };

      if (existing) {
        await this.insightsRepo.update({ jobId }, record);
      } else {
        await this.insightsRepo.save(this.insightsRepo.create({ jobId, ...record }));
      }

      const itemCounts = enriched.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      this.logger.log(
        `[${jobId}] Insights saved — ` +
        `commute:${itemCounts.commute ?? 0} stay:${itemCounts.stay ?? 0} ` +
        `activity:${itemCounts.activity ?? 0} food:${itemCounts.food ?? 0}`
      );

      // Refresh creator topEntities with place/activity names from this video
      const entityNames = Array.from(new Set(
        enriched.flatMap(i => [i.name, i.place].filter(Boolean) as string[])
      )).slice(0, 10);

      if (entityNames.length > 0) {
        const jobRecord = await this.jobRepo.findOne({ where: { id: jobId } });
        if (jobRecord?.creator) {
          const creatorRecord = await this.creatorRepo.findOne({
            where: { handle: jobRecord.creator },
          });
          if (creatorRecord) {
            const merged = Array.from(new Set([
              ...(creatorRecord.topEntities ?? []),
              ...entityNames,
            ])).slice(0, 20);
            await this.creatorRepo.update(
              { handle: jobRecord.creator },
              { topEntities: merged },
            );
          }
        }
      }

    } catch (err) {
      this.logger.warn(`[${jobId}] Insights extraction failed: ${err.message} — saving empty`);
      const existing = await this.insightsRepo.findOne({ where: { jobId } });
      const empty = { stays: [], places: [], food: [], budget: [], itinerary: [], itineraryItems: [], hasItinerary: false };
      if (existing) {
        await this.insightsRepo.update({ jobId }, empty);
      } else {
        await this.insightsRepo.save(this.insightsRepo.create({ jobId, ...empty }));
      }
    }
  }

  // ── Claude Haiku extraction ──────────────────────────────
  private async claudeExtract(
    rawText:     string,
    country:     string | null,
    contentType: string,
    chapters:    VideoChapter[],
    tags:        string[],
    caption:     string | null,
    creator:     string | null,
  ): Promise<ExtractedInsights> {
    const chapterContext = chapters.length
      ? `\nVideo chapters:\n${chapters.map(c => `  - ${c.title}`).join('\n')}`
      : '';

    const tagContext = tags.length
      ? `\nTags: ${tags.slice(0, 15).join(', ')}`
      : '';

    const prompt = `You are a travel content analyst. Extract structured travel information from this video.

Context:
- Caption: ${caption ?? 'unknown'}
- Creator: ${creator ?? 'unknown'}
- Country: ${country ?? 'unknown'}
- Content type: ${contentType}${chapterContext}${tagContext}

Transcript (first 4000 chars):
${rawText.slice(0, 4000)}

Extract and return ONLY valid JSON with these fields:

{
  "itineraryItems": [
    {
      "type": "commute",
      "name": "Flight from Bangkok to Chiang Mai",
      "place": "Suvarnabhumi Airport",
      "notes": "1 hour flight, ~$40",
      "day": 1,
      "time": "08:00"
    },
    {
      "type": "stay",
      "name": "The Nap Patong",
      "place": "Patong Beach, Phuket",
      "notes": "₿1200/night, rooftop pool",
      "day": 1,
      "time": null
    },
    {
      "type": "activity",
      "name": "Visit Wat Phra Kaew",
      "place": "Grand Palace, Bangkok",
      "notes": "500 THB entry, arrive early",
      "day": 2,
      "time": "09:00"
    },
    {
      "type": "food",
      "name": "Pad See Ew at Jay Fai",
      "place": "Jay Fai restaurant, Bangkok",
      "notes": "Michelin star, must book ahead",
      "day": 2,
      "time": "13:00"
    }
  ],
  "stays": [
    {"name": "hotel name", "location": "area/city", "pricePerNight": "price or null", "type": "hotel", "notes": "notes or null"}
  ],
  "places": [
    {"name": "place name", "category": "landmark", "notes": "description or null", "mustVisit": true}
  ],
  "food": [
    {"name": "dish name", "restaurant": "restaurant name or null", "price": "price or null", "rating": "creator rating or null", "notes": "notes or null"}
  ],
  "budget": [
    {"category": "accommodation", "amount": "50", "currency": "USD", "notes": "per night"}
  ],
  "itinerary": [],
  "currency": "THB",
  "hasItinerary": true
}

Rules:
- itineraryItems: flat list ordered by day then time. "commute" = transport between locations. "stay" = accommodation. "activity" = sightseeing/experiences. "food" = meals/restaurants/cafes.
- Extract every specific place, restaurant, transport leg, and accommodation mentioned.
- Use null for unknown fields.
- Return ONLY the JSON object, no markdown, no explanation.`;

    const completion = await this.groq.chat.completions.create({
      model:           'llama-3.3-70b-versatile',
      temperature:     0,
      response_format: { type: 'json_object' },
      messages:        [{ role: 'user', content: prompt }],
    });

    const raw = (completion.choices[0].message.content ?? '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in Gemini response');

    const data = JSON.parse(match[0]);

    return {
      stays:          Array.isArray(data.stays)          ? data.stays          : [],
      places:         Array.isArray(data.places)         ? data.places         : [],
      food:           Array.isArray(data.food)           ? data.food           : [],
      budget:         Array.isArray(data.budget)         ? data.budget         : [],
      itinerary:      Array.isArray(data.itinerary)      ? data.itinerary      : [],
      itineraryItems: Array.isArray(data.itineraryItems) ? data.itineraryItems : [],
      currency:       data.currency     ?? null,
      hasItinerary:   data.hasItinerary ?? false,
    };
  }

  // ── Google Places enrichment ─────────────────────────────
  private async enrichWithPlaces(
    jobId:  string,
    items:  ItineraryItem[],
    country: string | null,
  ): Promise<ItineraryItem[]> {
    const apiKey = process.env.GOOGLE_PLACES_KEY;
    if (!apiKey) return items;

    const enrichable = items.filter(i => i.type === 'activity' || i.type === 'food' || i.type === 'stay');
    if (!enrichable.length) return items;

    const enriched = await Promise.all(
      items.map(async item => {
        if (item.type !== 'activity' && item.type !== 'food' && item.type !== 'stay') return item;
        if (!item.place && !item.name) return item;

        try {
          const query  = encodeURIComponent(`${item.place ?? item.name}${country ? ` ${country}` : ''}`);
          const url    = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
          const res    = await fetch(url, { signal: AbortSignal.timeout(5_000) });
          const data   = await res.json() as {
            results: {
              place_id:          string;
              geometry:          { location: { lat: number; lng: number } };
              formatted_address: string;
              rating?:           number;
              price_level?:      number;
            }[];
          };

          const top = data.results?.[0];
          if (!top) return item;

          return {
            ...item,
            placeId:    top.place_id,
            lat:        top.geometry.location.lat,
            lng:        top.geometry.location.lng,
            address:    top.formatted_address,
            rating:     top.rating     ?? null,
            priceLevel: top.price_level ?? null,
          } satisfies ItineraryItem;

        } catch {
          return item;
        }
      })
    );

    this.logger.log(`[${jobId}] Places enriched — ${enrichable.length} items sent to Google Places`);
    return enriched;
  }

  // ── Budget helper ────────────────────────────────────────
  private calcTotalBudget(budget: BudgetItem[]): number {
    if (!budget?.length) return 0;
    const usdRates: Record<string, number> = {
      USD: 1, EUR: 1.08, GBP: 1.27,
      JPY: 0.0067, THB: 0.028, IDR: 0.000064,
      INR: 0.012,  VND: 0.000041,
    };
    return budget.reduce((sum, b) => {
      const rate   = usdRates[b.currency] ?? 1;
      const amount = parseFloat(b.amount) || 0;
      return sum + amount * rate;
    }, 0);
  }
}
