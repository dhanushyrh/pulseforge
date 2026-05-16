// apps/ui/src/types/index.ts
export type JobStatus    = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'not_travel';
export type ContentType  = 'reel' | 'vlog' | 'short' | 'unknown';
export type Platform     = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'other';

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

export interface CreatorProfile {
  id:                  string;
  handle:              string;
  displayName:         string | null;
  platform:            string;
  profileUrl:          string | null;
  bio:                 string | null;
  avatarUrl:           string | null;
  videoCount:          number;
  avgCommentCount:     number | null;
  avgTravelConfidence: number;
  topCountries:        string[];
  contentTypes:        string[];
  topEntities:         string[];
  createdAt:           string;
  updatedAt:           string;
}

export interface CreatorProfileWithVideos extends CreatorProfile {
  videos: ContentItem[];
}

// ── Trip Planner ──────────────────────────────────────────

export type StopType = 'stay' | 'place' | 'food' | 'activity' | 'transport';

export interface AffiliateLink {
  id:           string;
  tripStopId:   string;
  provider:     string;
  displayPrice: string | null;
  isFeatured:   boolean;
  isSponsored:  boolean;
  clickCount:   number;
}

export interface TripStop {
  id:                  string;
  tripId:              string;
  dayNumber:           number;
  position:            number;
  stopType:            StopType;
  name:                string;
  notes:               string | null;
  privateNote:         string | null;
  timeOfDay:           string | null;
  durationMinutes:     number | null;
  googlePlaceId:       string | null;
  latitude:            number | null;
  longitude:           number | null;
  formattedAddress:    string | null;
  googleRating:        number | null;
  priceLevel:          number | null;
  priceEstimate:       number | null;
  currency:            string | null;
  sourceJobId:         string | null;
  sourceInsightType:   string | null;
  thumbnailUrl:        string | null;
  isGeocoded:          boolean;
  placeDetailsFetched: boolean;
  transitFromPrev:     string | null;
  affiliateLinks?:     AffiliateLink[];
  createdAt:           string;
  updatedAt:           string;
}

export interface TripDay {
  dayNumber: number;
  title:     string;
  stops:     TripStop[];
}

export interface TripSummary {
  id:                  string;
  title:               string;
  country:             string;
  countryCode:         string | null;
  coverImageUrl:       string | null;
  startDate:           string | null;
  endDate:             string | null;
  dayCount:            number;
  status:              string;
  shareToken:          string | null;
  stopCount?:          number;
  stayCount?:          number;
  totalBudgetEstimate: number | null;
  currency:            string | null;
  centerLat:           number | null;
  centerLng:           number | null;
  defaultZoom:         number;
  createdAt:           string;
  updatedAt:           string;
}

export interface TripDetail extends TripSummary {
  days: Record<number, TripDay>;
}

export interface CreateTripPayload {
  title:       string;
  country:     string;
  countryCode?: string;
  startDate?:  string;
  endDate?:    string;
  dayCount?:   number;
}

export interface CreateStopPayload {
  tripId:             string;
  dayNumber:          number;
  position?:          number;
  stopType:           StopType;
  name:               string;
  notes?:             string;
  timeOfDay?:         string;
  durationMinutes?:   number;
  priceEstimate?:     number;
  currency?:          string;
  sourceJobId?:       string;
  sourceInsightType?: string;
}

export interface BulkImportPayload {
  jobId:      string;
  dayNumber:  number;
  types?:     string[];
}

// ── AI Rate Limiting ──────────────────────────────────────

export interface UsageStats {
  plan:    string;
  date:    string;
  resetAt: string;
  messages: {
    used:      number;
    limit:     number;   // -1 = unlimited
    remaining: number;
    pct:       number;
  };
  tokens: {
    inputUsed:   number;
    inputLimit:  number;
    outputUsed:  number;
    outputLimit: number;
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

export type SseEvent =
  | { type: 'text';          delta: string }
  | { type: 'error';         code: string; message: string; resetAt?: string; upgrade?: boolean; feature?: string }
  | { type: 'warning';       message: string; remaining: number }
  | { type: 'usage_update';  data: UsageStats }
  | { type: 'model_degraded'; model: string; message: string }
  | { type: 'feature_gated'; feature: string; message: string; upgrade: boolean }
  | { type: 'done' };

// ── Place Details ─────────────────────────────────────────

export interface PlacePhoto {
  photoReference: string;
  width:          number;
  height:         number;
  cachedUrl:      string | null;
}

export interface PlaceOpeningHours {
  openNow:     boolean;
  weekdayText: string[];
  todayHours:  string | null;
}

export interface PlaceDetailsData {
  googlePlaceId:    string;
  name:             string;
  placeType:        string | null;
  allTypes:         string[];
  rating:           number | null;
  userRatingsTotal: number | null;
  formattedAddress: string | null;
  vicinity:         string | null;
  phoneNumber:      string | null;
  website:          string | null;
  googleMapsUrl:    string | null;
  priceLevel:       number | null;
  priceLevelLabel:  string | null;
  latitude:         number | null;
  longitude:        number | null;
  editorialSummary: string | null;
  openingHours:     PlaceOpeningHours | null;
  photos:           PlacePhoto[];
  primaryPhotoUrl:  string | null;
  lastFetchedAt:    string | null;
}

export interface CommunityNote {
  id:         string;
  note:       string;
  agreeCount: number;
  hasAgreed:  boolean;
  isOwn:      boolean;
  userId:     string;
  createdAt:  string;
}

export interface PlaceSource {
  jobId:    string;
  caption:  string | null;
  creator:  string | null;
  platform: string;
  url:      string;
}

export interface PlaceWithContext extends PlaceDetailsData {
  communityNotes: CommunityNote[];
  privateNote:    string | null;
  sources: {
    count: number;
    items: PlaceSource[];
  };
  userNoteId: string | null;
}
