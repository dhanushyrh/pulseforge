import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSharedTrip } from '../api';
import TripMap from '../components/TripMap';
import TripSidebar from '../components/TripSidebar';

export default function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const [selectedDay, setSelectedDay]     = useState<number | 'all'>('all');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['shared-trip', token],
    queryFn: () => getSharedTrip(token!),
  });

  const handleStopSelect = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
  }, []);

  if (isLoading) {
    return (
      <div style={styles.center}>
        <span style={{ color: '#94a3b8' }}>Loading shared trip…</span>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#f87171' }}>This shared trip link is invalid or has expired.</p>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      {/* Read-only sidebar — no edit props */}
      <TripSidebar
        trip={trip}
        selectedDay={selectedDay}
        selectedStopId={selectedStopId}
        onDayChange={setSelectedDay}
        onStopSelect={handleStopSelect}
        readOnly
      />

      <div style={styles.mapArea}>
        <TripMap
          trip={trip}
          selectedDay={selectedDay}
          selectedStopId={selectedStopId}
          onStopSelect={handleStopSelect}
        />

        {/* CTA banner */}
        <div style={styles.cta}>
          <span style={styles.ctaText}>Plan your own trip with PulseForge</span>
          <Link to="/register" style={styles.ctaBtn}>Get started free →</Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell:   { display: 'flex', height: '100vh', overflow: 'hidden' },
  mapArea: { flex: 1, position: 'relative' },
  center:  { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  cta:     { position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#0f1117ee', border: '1px solid #534AB7', borderRadius: 12, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 20, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' },
  ctaText: { fontSize: 14, color: '#e2e8f0' },
  ctaBtn:  { background: '#534AB7', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
};
