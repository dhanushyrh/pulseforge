import React from 'react';

type GatedFeature =
  | 'generate_trip'
  | 'search_flights'
  | 'search_hotels'
  | 'check_visa'
  | 'web_search'
  | 'get_local_events'
  | 'proactive_insights';

interface Props {
  feature:  GatedFeature | string;
  onClose?: () => void;
}

const FEATURE_COPY: Record<string, { title: string; description: string }> = {
  generate_trip: {
    title:       'Full trip generation from a prompt',
    description: 'Describe your dream trip and AI builds the full itinerary — stops, stays, budget and all.',
  },
  search_flights: {
    title:       'Real-time flight search and price comparison',
    description: 'Search live prices from Skyscanner and insert booking links directly into your itinerary.',
  },
  search_hotels: {
    title:       'Hotel availability and price search',
    description: 'Compare hotels at each destination and book with one click.',
  },
  check_visa: {
    title:       'Visa requirement checker',
    description: 'Instant visa info for your passport and destination — no guesswork.',
  },
  web_search: {
    title:       'Live web search for travel info',
    description: 'AI searches the web in real time for up-to-date travel tips and advisories.',
  },
  get_local_events: {
    title:       'Local events at your destination',
    description: 'Discover festivals, concerts and experiences happening when you arrive.',
  },
  proactive_insights: {
    title:       'Proactive trip analysis',
    description: 'AI automatically flags schedule conflicts, weather alerts and budget issues.',
  },
};

export function FeatureGatePrompt({ feature, onClose }: Props) {
  const copy = FEATURE_COPY[feature] ?? {
    title:       'Pro feature',
    description: 'This feature is available on the Pro plan.',
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>Pro feature</span>
        </div>
        {onClose && (
          <button onClick={onClose} style={closeBtn} aria-label="Dismiss">✕</button>
        )}
      </div>

      <p style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
        {copy.title}
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
        {copy.description}
      </p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <a href="/settings/billing" style={btnUpgrade}>
          Upgrade to Pro — $9/month
        </a>
        <a href="/settings/billing#compare" style={linkCompare}>
          What's included?
        </a>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background:   '#0f1721',
  border:       '1px solid #312e81',
  borderRadius: 12,
  padding:      '16px 18px',
  margin:       '8px 0',
  maxWidth:     480,
};

const closeBtn: React.CSSProperties = {
  background:  'none',
  border:      'none',
  color:       '#64748b',
  cursor:      'pointer',
  fontSize:    14,
  padding:     0,
  lineHeight:  1,
};

const btnUpgrade: React.CSSProperties = {
  display:        'inline-block',
  padding:        '8px 16px',
  background:     '#6366f1',
  color:          '#fff',
  borderRadius:   7,
  fontSize:       13,
  fontWeight:     600,
  textDecoration: 'none',
  whiteSpace:     'nowrap',
};

const linkCompare: React.CSSProperties = {
  fontSize:       12,
  color:          '#818cf8',
  textDecoration: 'none',
  whiteSpace:     'nowrap',
};
