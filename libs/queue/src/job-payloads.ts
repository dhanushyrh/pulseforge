// libs/queue/src/job-payloads.ts
export interface MediaJobPayload {
  jobId: string;
  url: string;
  priority: 'low' | 'high';
}

export interface TranscriptJobPayload {
  jobId: string;
  mediaId: string;
  storagePath: string;  // MinIO URI
}

export interface EmbeddingJobPayload {
  jobId: string;
  transcriptId: string;
  rawText: string;
}

export interface SummaryJobPayload {
  jobId: string;
  transcriptId: string;
  rawText: string;
}