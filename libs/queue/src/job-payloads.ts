// libs/queue/src/job-payloads.ts
export interface MediaJobPayload {
  jobId:    string;
  url:      string;
  priority: 'low' | 'high';
}

export interface VideoChapter {
  title:     string;
  startTime: number;
  endTime:   number;
}

export interface MetadataJobPayload {
  jobId:       string;
  url:         string;
  storagePath: string;
  mediaId:     string;
}

export interface ClassifierJobPayload {
  jobId:       string;
  url:         string;
  storagePath: string;
  mediaId:     string;
  caption:     string | null;
  description: string | null;
  creator:     string | null;
  country:     string | null;
  countryCode: string | null;
  contentType: string;
  platform:    string;
  chapters:    VideoChapter[];
  tags:        string[];
}

export interface TranscriptJobPayload {
  jobId:       string;
  mediaId:     string;
  storagePath: string;
  url:         string;
  chapters:    VideoChapter[];
  tags:        string[];
  caption:     string | null;
  description: string | null;
  creator:     string | null;
  country:     string | null;
  contentType: string;
}

export interface EmbeddingJobPayload {
  jobId:        string;
  transcriptId: string;
  rawText:      string;
}

export interface SummaryJobPayload {
  jobId:        string;
  transcriptId: string;
  rawText:      string;
  chapters:     VideoChapter[];
  tags:         string[];
  caption:      string | null;
  creator:      string | null;
  country:      string | null;
  contentType:  string;
}

export interface InsightsJobPayload {
  jobId:        string;
  transcriptId: string;
  rawText:      string;
  country:      string | null;
  contentType:  string;
  chapters:     VideoChapter[];
  tags:         string[];
  caption:      string | null;
  creator:      string | null;
}