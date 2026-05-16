import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Redis } from 'ioredis';
import { AiUsage } from '@app/database';
import {
  AI_LIMITS, ALL_TOOL_NAMES, PlanKey,
  getUtcDateString, getTtlToMidnight, getNextMidnightUTC,
} from './ai-limits.constants';

export const REDIS_CLIENT = 'AI_REDIS_CLIENT';

export interface AiUsageStatus {
  date:               string;
  messageCount:       number;
  inputTokensUsed:    number;
  outputTokensUsed:   number;
  toolCallCount:      number;
  generateTripCount:  number;
}

export interface LimitCheckResult {
  allowed:          boolean;
  reason:           string | null;
  model:            string | null;
  tools:            string[];
  isDegraded:       boolean;
  isWarning:        boolean;
  usage:            AiUsageStatus;
  resetAt:          string;
  remaining:        { messages: number; inputTokens: number; outputTokens: number };
  upgradeRequired:  boolean;
  message:          string | null;
  warningMessage:   string | null;
}

export interface UsageStats {
  plan: string;
  date: string;
  resetAt: string;
  messages: { used: number; limit: number; remaining: number; pct: number };
  tokens: {
    inputUsed: number; inputLimit: number;
    outputUsed: number; outputLimit: number;
  };
  model:      string;
  isDegraded: boolean;
  isWarning:  boolean;
  features: {
    generateTrip:      boolean;
    proactiveInsights: boolean;
    flightSearch:      boolean;
    hotelSearch:       boolean;
    visaCheck:         boolean;
    webSearch:         boolean;
    eventsSearch:      boolean;
  };
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    @InjectRepository(AiUsage) private readonly aiUsageRepo: Repository<AiUsage>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getUsage(userId: string): Promise<AiUsageStatus> {
    const today = getUtcDateString();
    const cacheKey = `pulseforge:ai:usage:${userId}:${today}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as AiUsageStatus;

    const record = await this.aiUsageRepo.findOne({ where: { userId, date: today } });

    const status: AiUsageStatus = {
      date:              today,
      messageCount:      record?.messageCount      ?? 0,
      inputTokensUsed:   record?.inputTokensUsed   ?? 0,
      outputTokensUsed:  record?.outputTokensUsed  ?? 0,
      toolCallCount:     record?.toolCallCount      ?? 0,
      generateTripCount: record?.generateTripCount  ?? 0,
    };

    await this.redis.setex(cacheKey, getTtlToMidnight(), JSON.stringify(status));
    return status;
  }

  async checkLimits(userId: string, plan: string): Promise<LimitCheckResult> {
    const key = (plan in AI_LIMITS ? plan : 'free') as PlanKey;
    const limits = AI_LIMITS[key];
    const usage  = await this.getUsage(userId);
    const resetAt = getNextMidnightUTC();

    if (usage.messageCount >= limits.messagesPerDay) {
      return {
        allowed:         false,
        reason:          'daily_message_limit',
        model:           null,
        tools:           [],
        isDegraded:      false,
        isWarning:       false,
        usage,
        resetAt,
        remaining:       { messages: 0, inputTokens: 0, outputTokens: 0 },
        upgradeRequired: key === 'free',
        message:         key === 'free'
          ? `You've used all ${limits.messagesPerDay} free AI messages today. Upgrade to Pro for 100 messages/day, or wait until midnight UTC.`
          : `You've reached your daily limit of ${limits.messagesPerDay} messages. Resets at midnight UTC.`,
        warningMessage:  null,
      };
    }

    if (usage.inputTokensUsed >= limits.inputTokensPerDay) {
      return {
        allowed:         false,
        reason:          'daily_token_limit',
        model:           null,
        tools:           [],
        isDegraded:      false,
        isWarning:       false,
        usage,
        resetAt,
        remaining:       { messages: 0, inputTokens: 0, outputTokens: 0 },
        upgradeRequired: key === 'free',
        message:         `You've reached your daily token limit. Resets at midnight UTC.`,
        warningMessage:  null,
      };
    }

    const isDegraded = usage.messageCount >= limits.degradeAt;
    const isWarning  = usage.messageCount >= limits.warnAt;

    const model = isDegraded ? limits.model.degraded : limits.model.normal;

    const tools: string[] =
      limits.allowedTools === 'all' ? ALL_TOOL_NAMES : [...limits.allowedTools];

    const remaining = {
      messages:     limits.messagesPerDay === Infinity ? Infinity : limits.messagesPerDay - usage.messageCount,
      inputTokens:  limits.inputTokensPerDay === Infinity ? Infinity : limits.inputTokensPerDay - usage.inputTokensUsed,
      outputTokens: limits.outputTokensPerDay === Infinity ? Infinity : limits.outputTokensPerDay - usage.outputTokensUsed,
    };

    let warningMessage: string | null = null;
    if (isWarning && !isDegraded) {
      warningMessage = `${remaining.messages} AI messages remaining today`;
    } else if (isDegraded && key === 'pro') {
      warningMessage = `Switched to faster model — ${remaining.messages} messages remaining`;
    }

    return {
      allowed:         true,
      reason:          null,
      model,
      tools,
      isDegraded,
      isWarning,
      usage,
      resetAt,
      remaining,
      upgradeRequired: false,
      message:         null,
      warningMessage,
    };
  }

  async recordUsage(
    userId: string,
    plan: string,
    tokens: { inputTokens: number; outputTokens: number; toolCalls: number; isGenerateTrip?: boolean },
  ): Promise<void> {
    const today  = getUtcDateString();
    const ttl    = getTtlToMidnight();
    const msgKey = `pulseforge:ai:messages:${userId}:${today}`;
    const inKey  = `pulseforge:ai:input_tokens:${userId}:${today}`;
    const outKey = `pulseforge:ai:output_tokens:${userId}:${today}`;
    const cache  = `pulseforge:ai:usage:${userId}:${today}`;

    const pipeline = this.redis.pipeline();
    pipeline.incrby(msgKey, 1);
    pipeline.incrby(inKey,  tokens.inputTokens);
    pipeline.incrby(outKey, tokens.outputTokens);
    pipeline.expire(msgKey, ttl);
    pipeline.expire(inKey,  ttl);
    pipeline.expire(outKey, ttl);
    pipeline.del(cache);
    await pipeline.exec();

    this.syncToPostgres(userId, today, tokens).catch(err =>
      this.logger.error('Usage sync to Postgres failed:', err),
    );
  }

  private async syncToPostgres(
    userId: string,
    date: string,
    tokens: { inputTokens: number; outputTokens: number; toolCalls: number; isGenerateTrip?: boolean },
  ): Promise<void> {
    const existing = await this.aiUsageRepo.findOne({ where: { userId, date } });
    if (existing) {
      await this.aiUsageRepo.update(
        { userId, date },
        {
          messageCount:      existing.messageCount      + 1,
          inputTokensUsed:   existing.inputTokensUsed   + tokens.inputTokens,
          outputTokensUsed:  existing.outputTokensUsed  + tokens.outputTokens,
          toolCallCount:     existing.toolCallCount      + tokens.toolCalls,
          generateTripCount: existing.generateTripCount  + (tokens.isGenerateTrip ? 1 : 0),
        },
      );
    } else {
      await this.aiUsageRepo.save({
        userId,
        date,
        messageCount:      1,
        inputTokensUsed:   tokens.inputTokens,
        outputTokensUsed:  tokens.outputTokens,
        toolCallCount:     tokens.toolCalls,
        generateTripCount: tokens.isGenerateTrip ? 1 : 0,
      });
    }
  }

  checkFeatureAccess(plan: string, feature: string): boolean {
    const key = (plan in AI_LIMITS ? plan : 'free') as PlanKey;
    const limits = AI_LIMITS[key];
    if (limits.allowedTools === 'all') return true;
    return !limits.gatedFeatures.includes(feature);
  }

  async getUsageStats(userId: string, plan: string): Promise<UsageStats> {
    const key    = (plan in AI_LIMITS ? plan : 'free') as PlanKey;
    const limits = AI_LIMITS[key];
    const usage  = await this.getUsage(userId);
    const today  = getUtcDateString();

    const toLimit = (v: number) => (v === Infinity ? -1 : v);
    const msgLimit = limits.messagesPerDay;
    const inLimit  = limits.inputTokensPerDay;
    const outLimit = limits.outputTokensPerDay;

    return {
      plan,
      date:    today,
      resetAt: getNextMidnightUTC(),
      messages: {
        used:      usage.messageCount,
        limit:     toLimit(msgLimit),
        remaining: msgLimit === Infinity ? -1 : msgLimit - usage.messageCount,
        pct:       msgLimit === Infinity ? 0 : Math.round((usage.messageCount / msgLimit) * 100),
      },
      tokens: {
        inputUsed:   usage.inputTokensUsed,
        inputLimit:  toLimit(inLimit),
        outputUsed:  usage.outputTokensUsed,
        outputLimit: toLimit(outLimit),
      },
      model:      limits.model.normal,
      isDegraded: usage.messageCount >= limits.degradeAt,
      isWarning:  usage.messageCount >= limits.warnAt,
      features: {
        generateTrip:      this.checkFeatureAccess(plan, 'generate_trip'),
        proactiveInsights: this.checkFeatureAccess(plan, 'proactive_insights'),
        flightSearch:      this.checkFeatureAccess(plan, 'search_flights'),
        hotelSearch:       this.checkFeatureAccess(plan, 'search_hotels'),
        visaCheck:         this.checkFeatureAccess(plan, 'check_visa'),
        webSearch:         this.checkFeatureAccess(plan, 'web_search'),
        eventsSearch:      this.checkFeatureAccess(plan, 'get_local_events'),
      },
    };
  }

  async getUsageHistory(userId: string, days: number): Promise<AiUsage[]> {
    return this.aiUsageRepo
      .createQueryBuilder('u')
      .where('u.userId = :userId', { userId })
      .orderBy('u.date', 'DESC')
      .limit(days)
      .getMany();
  }

  async getAdminStats() {
    const today = getUtcDateString();
    const raw = await this.aiUsageRepo
      .createQueryBuilder('u')
      .select('SUM(u.messageCount)',      'messages')
      .addSelect('SUM(u.inputTokensUsed)',  'inputTokens')
      .addSelect('SUM(u.outputTokensUsed)', 'outputTokens')
      .where('u.date = :date', { date: today })
      .getRawOne<{ messages: string; inputTokens: string; outputTokens: string }>();

    const messages     = parseInt(raw?.messages     ?? '0', 10);
    const inputTokens  = parseInt(raw?.inputTokens  ?? '0', 10);
    const outputTokens = parseInt(raw?.outputTokens ?? '0', 10);

    const haikuCost  = (inputTokens * 0.8 + outputTokens * 4) / 1_000_000;
    const sonnetCost = (inputTokens * 3   + outputTokens * 15) / 1_000_000;

    return {
      today: { messages, inputTokens, outputTokens },
      estimatedCostUsd: { haiku: haikuCost, sonnet: sonnetCost },
    };
  }
}
