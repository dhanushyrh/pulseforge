export const AI_LIMITS = {
  free: {
    messagesPerDay:     10,
    inputTokensPerDay:  20_000,
    outputTokensPerDay: 10_000,
    warnAt:             8,
    degradeAt:          9,
    model: {
      normal:   'claude-haiku-4-5-20251001',
      degraded: null as string | null,
    },
    allowedTools: [
      'search_user_dataset',
      'get_weather',
      'get_trip_detail',
      'add_stop_to_trip',
      'update_stop',
      'remove_stop',
    ] as readonly string[],
    gatedFeatures: [
      'generate_trip',
      'proactive_insights',
      'search_flights',
      'search_hotels',
      'get_local_events',
      'check_visa',
      'web_search',
    ] as readonly string[],
  },

  pro: {
    messagesPerDay:     100,
    inputTokensPerDay:  200_000,
    outputTokensPerDay: 100_000,
    warnAt:             80,
    degradeAt:          90,
    model: {
      normal:   'claude-sonnet-4-6',
      degraded: 'claude-haiku-4-5-20251001' as string | null,
    },
    allowedTools: 'all' as const,
    gatedFeatures: [] as readonly string[],
  },

  admin: {
    messagesPerDay:     Infinity,
    inputTokensPerDay:  Infinity,
    outputTokensPerDay: Infinity,
    warnAt:             Infinity,
    degradeAt:          Infinity,
    model: {
      normal:   'claude-sonnet-4-6',
      degraded: 'claude-sonnet-4-6' as string | null,
    },
    allowedTools: 'all' as const,
    gatedFeatures: [] as readonly string[],
  },
};

export type PlanKey = keyof typeof AI_LIMITS;

export const RESET_CRON = '0 0 * * *';

export const ALL_TOOL_NAMES: string[] = [
  'search_user_dataset',
  'get_weather',
  'get_trip_detail',
  'add_stop_to_trip',
  'update_stop',
  'remove_stop',
  'generate_trip',
  'proactive_insights',
  'search_flights',
  'search_hotels',
  'get_local_events',
  'check_visa',
  'web_search',
];

export function getUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getTtlToMidnight(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ));
  return Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

export function getNextMidnightUTC(): string {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ));
  return midnight.toISOString();
}
