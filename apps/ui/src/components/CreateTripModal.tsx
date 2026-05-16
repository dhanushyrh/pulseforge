import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTrip } from '../api';

interface Props {
  onClose: () => void;
}

export default function CreateTripModal({ onClose }: Props) {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle]         = useState('');
  const [country, setCountry]     = useState('');
  const [countryCode, setCC]      = useState('');
  const [startDate, setStart]     = useState('');
  const [endDate, setEnd]         = useState('');
  const [error, setError]         = useState('');

  const dayCount = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 7;

  const mutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate(`/trips/${trip.id}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message ?? 'Failed to create trip');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !country.trim()) {
      setError('Title and country are required');
      return;
    }
    mutation.mutate({
      title: title.trim(),
      country: country.trim(),
      countryCode: countryCode.trim() || undefined,
      startDate:  startDate || undefined,
      endDate:    endDate   || undefined,
      dayCount,
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>New Trip</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Trip title</label>
            <input
              style={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Japan trip · Spring 2025"
              required
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 2 }}>
              <label style={styles.label}>Country</label>
              <input
                style={styles.input}
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Japan"
                required
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Code (optional)</label>
              <input
                style={styles.input}
                value={countryCode}
                onChange={e => setCC(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="JP"
                maxLength={2}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Start date</label>
              <input style={styles.input} type="date" value={startDate} onChange={e => setStart(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>End date</label>
              <input style={styles.input} type="date" value={endDate} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>

          {(startDate && endDate) && (
            <div style={styles.daySummary}>{dayCount} day{dayCount !== 1 ? 's' : ''}</div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button
            style={styles.submitBtn}
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create trip & open planner →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay:    { position: 'fixed', inset: 0, background: '#00000080', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:      { background: '#0f1117', border: '1px solid #1e293b', borderRadius: 16, width: '100%', maxWidth: 460, padding: 24 },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:      { fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  closeBtn:   { background: 'none', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer' },
  field:      { marginBottom: 14, flex: 1 },
  row:        { display: 'flex', gap: 12 },
  label:      { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  input:      { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '10px 12px', boxSizing: 'border-box' },
  daySummary: { fontSize: 12, color: '#94a3b8', marginBottom: 14 },
  error:      { fontSize: 13, color: '#f87171', marginBottom: 14, padding: '8px 12px', background: '#f8717115', borderRadius: 8 },
  submitBtn:  { width: '100%', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
};
