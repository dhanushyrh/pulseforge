// apps/ui/src/api/index.ts
import axios from 'axios';
import type {
  ContentListResponse, ContentItem,
  CountryGroup, TypeGroup,
  SearchResult, StatsResponse,
  CreatorProfile, CreatorProfileWithVideos,
  TripSummary, TripDetail, TripStop, AffiliateLink,
  CreateTripPayload, CreateStopPayload, BulkImportPayload,
  UsageStats,
  PlaceDetailsData, PlaceWithContext, CommunityNote,
} from '../types';

const STORAGE = { access: 'pf_access_token', refresh: 'pf_refresh_token' };

export const api = axios.create({ baseURL: '/v1' });

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(error)));
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE.access);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const storedRefresh = localStorage.getItem(STORAGE.refresh);
      if (!storedRefresh) {
        isRefreshing = false;
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post('/v1/auth/refresh', { refreshToken: storedRefresh });
        const newToken: string = data.accessToken;
        localStorage.setItem(STORAGE.access, newToken);
        localStorage.setItem(STORAGE.refresh, data.refreshToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem(STORAGE.access);
        localStorage.removeItem(STORAGE.refresh);
        localStorage.removeItem('pf_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

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

export const getInsights = async (jobId: string) => {
  const { data } = await api.get(`/content/${jobId}/insights`);
  return data;
};

export const getUsage = async (): Promise<{
  plan: string; today: number; limit: number; remaining: number; resetAt: string;
}> => {
  const { data } = await api.get('/ingest/usage');
  return data;
};

// ── Creators ─────────────────────────────────────────────
export const getCreators = async (): Promise<CreatorProfile[]> => {
  const { data } = await api.get('/content/creators');
  return data;
};

export const getCreatorByHandle = async (
  handle: string,
): Promise<CreatorProfileWithVideos> => {
  const { data } = await api.get(
    `/content/creators/${encodeURIComponent(handle)}`,
  );
  return data;
};

// ── Trips ─────────────────────────────────────────────────
export const createTrip = async (dto: CreateTripPayload): Promise<TripSummary> => {
  const { data } = await api.post('/trips', dto);
  return data;
};

export const getTrips = async (): Promise<TripSummary[]> => {
  const { data } = await api.get('/trips');
  return data;
};

export const getTripDetail = async (id: string): Promise<TripDetail> => {
  const { data } = await api.get(`/trips/${id}`);
  return data;
};

export const updateTrip = async (id: string, dto: Partial<CreateTripPayload>): Promise<TripSummary> => {
  const { data } = await api.put(`/trips/${id}`, dto);
  return data;
};

export const deleteTrip = async (id: string): Promise<void> => {
  await api.delete(`/trips/${id}`);
};

export const generateShareToken = async (id: string): Promise<{ shareToken: string; shareUrl: string }> => {
  const { data } = await api.post(`/trips/${id}/share`);
  return data;
};

export const getSharedTrip = async (token: string): Promise<TripDetail> => {
  const { data } = await api.get(`/trips/shared/${token}`);
  return data;
};

// ── Stops ─────────────────────────────────────────────────
export const addStop = async (tripId: string, dto: Omit<CreateStopPayload, 'tripId'>): Promise<TripStop> => {
  const { data } = await api.post(`/trips/${tripId}/stops`, dto);
  return data;
};

export const bulkImportStops = async (tripId: string, dto: BulkImportPayload): Promise<TripStop[]> => {
  const { data } = await api.post(`/trips/${tripId}/stops/bulk-import`, dto);
  return data;
};

export const updateStop = async (tripId: string, stopId: string, dto: Partial<CreateStopPayload>): Promise<TripStop> => {
  const { data } = await api.put(`/trips/${tripId}/stops/${stopId}`, dto);
  return data;
};

export const deleteStop = async (tripId: string, stopId: string): Promise<void> => {
  await api.delete(`/trips/${tripId}/stops/${stopId}`);
};

export const reorderStops = async (tripId: string, dayNumber: number, orderedIds: string[]): Promise<void> => {
  await api.put(`/trips/${tripId}/stops/reorder`, { dayNumber, orderedIds });
};

// ── Affiliates ────────────────────────────────────────────
export const getAffiliateLinks = async (stopId: string): Promise<AffiliateLink[]> => {
  const { data } = await api.get(`/affiliates/links/${stopId}`);
  return data;
};

export const trackAffiliateClick = async (
  linkId: string,
  tripId?: string,
): Promise<{ clickId: string; redirectUrl: string }> => {
  const { data } = await api.post('/affiliates/click', { linkId, tripId });
  return data;
};

// ── AI ────────────────────────────────────────────────────
export const getAiUsage = async (): Promise<UsageStats> => {
  const { data } = await api.get('/ai/usage');
  return data;
};

export const getAiUsageHistory = async (days = 7): Promise<
  Array<{ date: string; messageCount: number; inputTokensUsed: number; outputTokensUsed: number }>
> => {
  const { data } = await api.get('/ai/usage/history', { params: { days } });
  return data;
};

// ── Places ────────────────────────────────────────────────
export const getPlaceDetails = async (googlePlaceId: string): Promise<PlaceDetailsData> => {
  const { data } = await api.get(`/places/${encodeURIComponent(googlePlaceId)}`);
  return data;
};

export const getPlaceFull = async (
  googlePlaceId: string,
  tripStopId?: string,
): Promise<PlaceWithContext> => {
  const { data } = await api.get(`/places/${encodeURIComponent(googlePlaceId)}/full`, {
    params: tripStopId ? { tripStopId } : undefined,
  });
  return data;
};

export const getCommunityNotes = async (googlePlaceId: string): Promise<CommunityNote[]> => {
  const { data } = await api.get(`/places/${encodeURIComponent(googlePlaceId)}/notes`);
  return data;
};

export const addCommunityNote = async (
  googlePlaceId: string,
  note: string,
): Promise<CommunityNote> => {
  const { data } = await api.post(`/places/${encodeURIComponent(googlePlaceId)}/notes`, { note });
  return data;
};

export const deleteCommunityNote = async (
  googlePlaceId: string,
  noteId: string,
): Promise<void> => {
  await api.delete(`/places/${encodeURIComponent(googlePlaceId)}/notes/${noteId}`);
};

export const agreeWithNote = async (
  noteId: string,
): Promise<{ agreed: boolean; agreeCount: number }> => {
  const { data } = await api.post(`/places/notes/${noteId}/agree`);
  return data;
};

export const updatePrivateNote = async (
  tripId: string,
  stopId: string,
  note: string,
): Promise<void> => {
  await api.patch(`/trips/${tripId}/stops/${stopId}/private-note`, { note });
};

export const refreshPlaceDetails = async (
  googlePlaceId: string,
): Promise<{ refreshing: boolean }> => {
  const { data } = await api.post(`/places/${encodeURIComponent(googlePlaceId)}/refresh`);
  return data;
};
