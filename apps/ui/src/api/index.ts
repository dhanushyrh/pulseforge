// apps/ui/src/api/index.ts
import axios from 'axios';
import type {
  ContentListResponse, ContentItem,
  CountryGroup, TypeGroup,
  SearchResult, StatsResponse,
} from '../types';

const api = axios.create({ baseURL: '/v1' });

// ── Content ──────────────────────────────────────────────
export const getContent = async (params: {
  page?:        number;
  limit?:       number;
  country?:     string;
  contentType?: string;
  status?:      string;
  search?:      string;
}): Promise<ContentListResponse> => {
  const { data } = await api.get('/content', { params });
  return data;
};

export const getContentById = async (jobId: string): Promise<ContentItem> => {
  const { data } = await api.get(`/content/${jobId}`);
  return data;
};

export const getStats = async (): Promise<StatsResponse> => {
  const { data } = await api.get('/content/stats');
  return data;
};

export const getCountries = async (): Promise<CountryGroup[]> => {
  const { data } = await api.get('/content/countries');
  return data;
};

export const getTypes = async (): Promise<TypeGroup[]> => {
  const { data } = await api.get('/content/types');
  return data;
};

// ── Search ───────────────────────────────────────────────
export const semanticSearch = async (params: {
  query:    string;
  limit?:   number;
  country?: string;
  platform?: string;
}): Promise<{ query: string; results: SearchResult[] }> => {
  const { data } = await api.post('/search', params);
  return data;
};

// ── Ingest ───────────────────────────────────────────────
export const ingestUrl = async (params: {
  url:       string;
  priority?: 'low' | 'high';
}): Promise<{ jobId: string; status: string }> => {
  const { data } = await api.post('/ingest', params);
  return data;
};