// apps/ui/src/types/index.ts
export type JobStatus    = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'not_travel';
export type ContentType  = 'reel' | 'vlog' | 'short' | 'unknown';
export type Platform     = 'youtube' | 'instagram' | 'twitter' | 'other';

export interface ContentItem {
  jobId:            string;
  url:              string;
  status:           JobStatus;
  platform:         Platform;
  contentType:      ContentType;
  country:          string | null;
  countryCode:      string | null;
  creator:          string | null;
  caption:          string | null;
  description:      string | null;
  summary:          string | null;
  sentiment:        string | null;
  entities:         string[];
  isTravel:         boolean;
  travelConfidence: number;
  createdAt:        string;
  updatedAt:        string;
}

export interface CountryGroup {
  country:     string;
  countryCode: string;
  count:       number;
}

export interface TypeGroup {
  contentType: ContentType;
  count:       number;
}

export interface SearchResult {
  score:    number;
  chunk:    string;
  jobId:    string;
  platform: string;
  creator:  string | null;
}

export interface ContentListResponse {
  items:  ContentItem[];
  total:  number;
  page:   number;
  limit:  number;
}

export interface StatsResponse {
  total:      number;
  travel:     number;
  notTravel:  number;
  processing: number;
  countries:  number;
}