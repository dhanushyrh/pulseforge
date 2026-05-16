import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrips, deleteTrip } from '../api';
import type { TripSummary } from '../types';
import CreateTripModal from '../components/CreateTripModal';

const STOP_COLORS: Record<string, string> = {
  stay: '#185FA5', place: '#534AB7', food: '#993C1D',
  activity: '#3B6D11', transport: '#888780',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b', active: '#4ade80', shared: '#818cf8', archived: '#475569',
};

export default function TripsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: getTrips,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Trips</h1>
          <p style={styles.subtitle}>{trips.length} trip{trips.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={styles.newBtn} onClick={() => setShowCreate(true)}>
          + New Trip
        </button>
      </div>

      {isLoading ? (
        <div style={styles.loading}>Loading trips…</div>
      ) : trips.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>🗺️</div>
          <p style={styles.emptyText}>No trips yet. Create your first one!</p>
          <button style={styles.newBtn} onClick={() => setShowCreate(true)}>
            + New Trip
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {trips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onOpen={() => navigate(`/trips/${trip.id}`)}
              onDelete={() => {
                if (confirm(`Delete "${trip.title}"?`)) deleteMutation.mutate(trip.id);
              }}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateTripModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function TripCard({
  trip, onOpen, onDelete,
}: {
  trip: TripSummary;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const flag = trip.countryCode
    ? String.fromCodePoint(...[...trip.countryCode.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
    : '🌍';

  return (
    <div style={styles.card}>
      <div style={styles.cardCover}>
        {trip.coverImageUrl
          ? <img src={trip.coverImageUrl} style={styles.coverImg} alt="" />
          : <div style={{ ...styles.coverPlaceholder, background: gradientFor(trip.country) }} />
        }
        <span style={{ ...styles.statusBadge, background: STATUS_COLORS[trip.status] ?? '#64748b' }}>
          {trip.status}
        </span>
      </div>

      <div style={styles.cardBody}>
        <div style={styles.cardTop}>
          <span style={styles.flag}>{flag}</span>
          <span style={styles.country}>{trip.country}</span>
        </div>
        <h3 style={styles.tripTitle}>{trip.title}</h3>
        <div style={styles.meta}>
          {trip.startDate && <span>{trip.startDate}</span>}
          <span>{trip.dayCount} day{trip.dayCount !== 1 ? 's' : ''}</span>
          {trip.stopCount != null && <span>{trip.stopCount} stops</span>}
          {trip.totalBudgetEstimate && (
            <span>{trip.currency ?? 'USD'} {trip.totalBudgetEstimate.toLocaleString()}</span>
          )}
        </div>
      </div>

      <div style={styles.cardActions}>
        <button style={styles.openBtn} onClick={onOpen}>Open planner</button>
        <button style={styles.deleteBtn} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function gradientFor(country: string): string {
  const n = country.charCodeAt(0) % 6;
  const gradients = [
    'linear-gradient(135deg,#534AB7,#185FA5)',
    'linear-gradient(135deg,#3B6D11,#185FA5)',
    'linear-gradient(135deg,#993C1D,#534AB7)',
    'linear-gradient(135deg,#854F0B,#993C1D)',
    'linear-gradient(135deg,#085041,#3B6D11)',
    'linear-gradient(135deg,#185FA5,#085041)',
  ];
  return gradients[n];
}

const styles: Record<string, React.CSSProperties> = {
  page:            { padding: '28px 32px', maxWidth: 1100, margin: '0 auto' },
  header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title:           { fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  subtitle:        { fontSize: 13, color: '#64748b', marginTop: 4 },
  newBtn:          { background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loading:         { color: '#94a3b8', textAlign: 'center', marginTop: 60 },
  empty:           { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 80 },
  emptyIcon:       { fontSize: 48 },
  emptyText:       { color: '#94a3b8', fontSize: 15 },
  grid:            { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 },
  card:            { background: '#161923', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  cardCover:       { position: 'relative', height: 130 },
  coverImg:        { width: '100%', height: '100%', objectFit: 'cover' },
  coverPlaceholder:{ width: '100%', height: '100%' },
  statusBadge:     { position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, color: '#fff', textTransform: 'capitalize' },
  cardBody:        { padding: '14px 16px', flex: 1 },
  cardTop:         { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 },
  flag:            { fontSize: 18 },
  country:         { fontSize: 12, color: '#94a3b8' },
  tripTitle:       { fontSize: 15, fontWeight: 600, color: '#f1f5f9', margin: '0 0 8px' },
  meta:            { display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: '#64748b' },
  cardActions:     { display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #1e293b' },
  openBtn:         { flex: 1, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  deleteBtn:       { background: 'none', color: '#f87171', border: '1px solid #f8717140', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' },
};
