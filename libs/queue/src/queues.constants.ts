// libs/queue/src/queues.constants.ts
export const QUEUES = {
  MEDIA:      'media',
  METADATA:   'metadata',
  CLASSIFIER: 'classifier',
  TRANSCRIPT: 'transcript',
  EMBEDDING:  'embedding',
  SUMMARY:    'summary',
  INSIGHTS:   'insights',
  GEOCODE:    'geocode',
} as const;

export const JOBS = {
  MEDIA:      'media.process',
  METADATA:   'metadata.process',
  CLASSIFIER: 'classifier.process',
  TRANSCRIPT: 'transcript.process',
  EMBEDDING:  'embedding.process',
  SUMMARY:    'summary.process',
  INSIGHTS:   'insights.process',
  GEOCODE:    'geocode.process',
} as const;