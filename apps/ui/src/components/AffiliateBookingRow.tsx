import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAffiliateLinks, trackAffiliateClick } from '../api';

const PROVIDER_LABELS: Record<string, string> = {
  booking_com:  'Booking.com',
  agoda:        'Agoda',
  hotels_com:   'Hotels.com',
  klook:        'Klook',
  viator:       'Viator',
  getyourguide: 'GetYourGuide',
  skyscanner:   'Skyscanner',
  google_maps:  'Google Maps',
};

const STOP_TYPE_LABELS: Record<string, string> = {
  stay:      'Book this stay',
  food:      'Explore food options',
  activity:  'Book this activity',
  place:     'Explore this place',
  transport: 'Book transport',
};

interface Props {
  stopId:   string;
  stopType: string;
  tripId?:  string;
}

export default function AffiliateBookingRow({ stopId, stopType, tripId }: Props) {
  const { data: links = [], isLoading } = useQuery({
    queryKey: ['affiliate-links', stopId],
    queryFn: () => getAffiliateLinks(stopId),
  });

  if (isLoading) return <div style={styles.loading}>Loading booking options…</div>;
  if (!links.length) return null;

  const handleClick = async (linkId: string) => {
    try {
      const { redirectUrl } = await trackAffiliateClick(linkId, tripId);
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.label}>{STOP_TYPE_LABELS[stopType] ?? 'Book now'}</div>
      <div style={styles.row}>
        {links.map(link => (
          <button
            key={link.id}
            style={{ ...styles.btn, ...(link.isFeatured ? styles.btnFeatured : {}) }}
            onClick={() => handleClick(link.id)}
          >
            <span style={styles.provider}>{PROVIDER_LABELS[link.provider] ?? link.provider}</span>
            {link.displayPrice && <span style={styles.price}>{link.displayPrice}</span>}
            {link.isSponsored && <span style={styles.sponsored}>Sponsored</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap:       { marginTop: 16 },
  label:      { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  row:        { display: 'flex', flexWrap: 'wrap', gap: 8 },
  btn:        { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, transition: 'border-color 0.15s' },
  btnFeatured:{ border: '1px solid #534AB7' },
  provider:   { fontSize: 12, fontWeight: 600, color: '#e2e8f0' },
  price:      { fontSize: 11, color: '#4ade80' },
  sponsored:  { fontSize: 9, color: '#64748b', background: '#0f172a', borderRadius: 3, padding: '1px 4px', textTransform: 'uppercase' },
  loading:    { fontSize: 12, color: '#64748b' },
};
