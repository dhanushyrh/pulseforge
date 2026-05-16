import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiUsageService } from './ai-usage.service';
import { AI_LIMITS, PlanKey } from './ai-limits.constants';

const ALL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_user_dataset',
    description: 'Search through your saved travel videos and extracted knowledge',
    input_schema: {
      type: 'object',
      properties: {
        query:   { type: 'string', description: 'Search query' },
        country: { type: 'string', description: 'Filter by country' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get current weather and forecast for a location',
    input_schema: {
      type: 'object',
      properties: { location: { type: 'string' } },
      required: ['location'],
    },
  },
  {
    name: 'get_trip_detail',
    description: 'Retrieve full details of a trip including all stops',
    input_schema: {
      type: 'object',
      properties: { tripId: { type: 'string' } },
      required: ['tripId'],
    },
  },
  {
    name: 'add_stop_to_trip',
    description: 'Add a new stop to a trip itinerary',
    input_schema: {
      type: 'object',
      properties: {
        tripId:    { type: 'string' },
        dayNumber: { type: 'number' },
        name:      { type: 'string' },
        stopType:  { type: 'string', enum: ['stay', 'place', 'food', 'activity', 'transport'] },
        notes:     { type: 'string' },
      },
      required: ['tripId', 'dayNumber', 'name', 'stopType'],
    },
  },
  {
    name: 'update_stop',
    description: 'Update details of an existing trip stop',
    input_schema: {
      type: 'object',
      properties: {
        tripId: { type: 'string' },
        stopId: { type: 'string' },
        notes:  { type: 'string' },
        name:   { type: 'string' },
      },
      required: ['tripId', 'stopId'],
    },
  },
  {
    name: 'remove_stop',
    description: 'Remove a stop from a trip',
    input_schema: {
      type: 'object',
      properties: {
        tripId: { type: 'string' },
        stopId: { type: 'string' },
      },
      required: ['tripId', 'stopId'],
    },
  },
  {
    name: 'generate_trip',
    description: 'Generate a full trip itinerary from a prompt (Pro only)',
    input_schema: {
      type: 'object',
      properties: {
        destination: { type: 'string' },
        days:        { type: 'number' },
        style:       { type: 'string' },
        budget:      { type: 'string' },
      },
      required: ['destination', 'days'],
    },
  },
  {
    name: 'search_flights',
    description: 'Search real-time flight prices (Pro only)',
    input_schema: {
      type: 'object',
      properties: {
        origin:      { type: 'string' },
        destination: { type: 'string' },
        date:        { type: 'string' },
      },
      required: ['origin', 'destination', 'date'],
    },
  },
  {
    name: 'search_hotels',
    description: 'Search hotel availability and prices (Pro only)',
    input_schema: {
      type: 'object',
      properties: {
        location:  { type: 'string' },
        checkIn:   { type: 'string' },
        checkOut:  { type: 'string' },
        guests:    { type: 'number' },
      },
      required: ['location', 'checkIn', 'checkOut'],
    },
  },
  {
    name: 'check_visa',
    description: 'Check visa requirements for a destination (Pro only)',
    input_schema: {
      type: 'object',
      properties: {
        nationality:  { type: 'string' },
        destination:  { type: 'string' },
      },
      required: ['nationality', 'destination'],
    },
  },
  {
    name: 'get_local_events',
    description: 'Find local events at a destination (Pro only)',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        date:     { type: 'string' },
      },
      required: ['location'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for travel information (Pro only)',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'proactive_insights',
    description: 'Analyze trip and provide proactive recommendations (Pro only)',
    input_schema: {
      type: 'object',
      properties: { tripId: { type: 'string' } },
      required: ['tripId'],
    },
  },
];

type ConversationMessage = Anthropic.MessageParam;

function getMaxTokens(plan: string): number {
  if (plan === 'admin') return 8192;
  if (plan === 'pro')   return 4096;
  return 1024;
}

function buildSystemPrompt(
  user: { userId: string; email: string; plan: string },
  limitResult: { isWarning: boolean; isDegraded: boolean; remaining: { messages: number } },
): string {
  const planNote = user.plan === 'free' ? `
IMPORTANT — USER IS ON FREE PLAN:
  - You ONLY have access to: search_user_dataset, get_weather, get_trip_detail, add_stop_to_trip, update_stop, remove_stop
  - If asked about flights, hotels, visa, events or web search, respond: "That requires a Pro subscription. I can search your saved videos instead — shall I look for that there?"
  - Do NOT call any tool not in your allowed list
  - Keep responses concise — free users have limited tokens
  - Naturally mention Pro benefits when relevant (max once per conversation)
` : '';

  const warningNote = limitResult.isWarning && !limitResult.isDegraded
    ? `\nTOKEN AWARENESS: User is approaching their daily limit (${limitResult.remaining.messages} messages left). Keep your response shorter than usual. Mention the limit naturally at the end if it's the last 2 messages.\n`
    : '';

  const degradedNote = limitResult.isDegraded && user.plan === 'pro'
    ? `\nMODEL NOTE: You are running in faster mode due to high usage today. Responses may be slightly less detailed. User has ${limitResult.remaining.messages} messages left.\n`
    : '';

  return `You are a travel planning AI assistant for PulseForge. You help users plan trips, discover destinations, and organize their travel itineraries. You have access to the user's saved travel videos and extracted insights from those videos.${planNote}${warningNote}${degradedNote}`;
}

@Injectable()
export class AiService {
  private readonly logger  = new Logger(AiService.name);
  private readonly anthropic: Anthropic;
  private readonly history = new Map<string, ConversationMessage[]>();

  constructor(
    private readonly aiUsageService: AiUsageService,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async *streamResponse(
    conversationId: string,
    userMessage: string,
    user: { userId: string; email: string; plan: string },
    tripId?: string,
    mode: 'chat' | 'generate' = 'chat',
  ): AsyncGenerator<object> {
    const limitResult = await this.aiUsageService.checkLimits(user.userId, user.plan);

    if (!limitResult.allowed) {
      yield {
        type:    'error',
        code:    limitResult.reason,
        message: limitResult.message,
        resetAt: limitResult.resetAt,
        upgrade: limitResult.upgradeRequired,
      };
      return;
    }

    if (mode === 'generate' && !this.aiUsageService.checkFeatureAccess(user.plan, 'generate_trip')) {
      yield {
        type:    'error',
        code:    'feature_gated',
        message: 'Trip generation requires Pro plan',
        feature: 'generate_trip',
        upgrade: true,
      };
      return;
    }

    if (limitResult.isDegraded && user.plan === 'pro') {
      yield {
        type:    'model_degraded',
        model:   limitResult.model,
        message: `Switched to faster model — ${limitResult.remaining.messages} messages remaining`,
      };
    }

    if (limitResult.isWarning && limitResult.warningMessage) {
      yield {
        type:      'warning',
        message:   limitResult.warningMessage,
        remaining: limitResult.remaining.messages,
      };
    }

    const key = (user.plan in AI_LIMITS ? user.plan : 'free') as PlanKey;
    const planLimits = AI_LIMITS[key];
    const allowedToolNames: string[] =
      planLimits.allowedTools === 'all' ? ALL_TOOLS.map(t => t.name) : [...planLimits.allowedTools];
    const filteredTools = ALL_TOOLS.filter(t => allowedToolNames.includes(t.name));

    const convoKey = `${user.userId}:${conversationId}`;
    const prevMessages = this.history.get(convoKey) ?? [];
    const messages: ConversationMessage[] = [
      ...prevMessages,
      { role: 'user', content: userMessage },
    ];

    // Limit in-memory history to last 20 messages to avoid unbounded growth
    if (messages.length > 20) messages.splice(0, messages.length - 20);

    let assistantText = '';
    let inputTokens   = 0;
    let outputTokens  = 0;
    let toolCalls     = 0;

    try {
      const stream = this.anthropic.messages.stream({
        model:      limitResult.model!,
        max_tokens: getMaxTokens(user.plan),
        system:     buildSystemPrompt(user, limitResult),
        tools:      filteredTools,
        messages,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          assistantText += event.delta.text;
          yield { type: 'text', delta: event.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      inputTokens  = finalMessage.usage.input_tokens;
      outputTokens = finalMessage.usage.output_tokens;
      toolCalls    = finalMessage.content.filter(b => b.type === 'tool_use').length;

      this.history.set(convoKey, [
        ...messages,
        { role: 'assistant', content: assistantText || '(no text response)' },
      ]);
    } catch (err) {
      this.logger.error('Anthropic stream error:', err);
      yield { type: 'error', code: 'stream_error', message: 'AI service error. Please try again.' };
      return;
    }

    await this.aiUsageService.recordUsage(user.userId, user.plan, {
      inputTokens,
      outputTokens,
      toolCalls,
      isGenerateTrip: mode === 'generate',
    });

    const updatedUsage = await this.aiUsageService.getUsageStats(user.userId, user.plan);
    yield { type: 'usage_update', data: updatedUsage };
  }
}
