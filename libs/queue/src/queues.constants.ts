// libs/queue/src/queues.constants.ts
export const QUEUES = {
  MEDIA:      'media',
  TRANSCRIPT: 'transcript',
  EMBEDDING:  'embedding',
  SUMMARY:    'summary',
} as const;

export const JOBS = {
  MEDIA:      'media.process',
  TRANSCRIPT: 'transcript.process',
  EMBEDDING:  'embedding.process',
  SUMMARY:    'summary.process',
} as const;