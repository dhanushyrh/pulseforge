import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { TripStop } from '../types';
import { updateStop, deleteStop } from '../api';
import AffiliateBookingRow from './AffiliateBookingRow';

const STOP_TYPE_ICONS: Record<string, string> = {
  stay: '🏨', place: '📍', food: '🍜', activity: '🎭', transport: '🚆',
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span style={{ color: '#fbbf24', fontSize: 13 }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <span style={{ color: '#64748b', fontSize: 11, marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

interface Props {
  stop:      TripStop;
  tripId:    string;
  onClose:   () => void;
  onUpdated: () => void;
}

export default function StopPopup({ stop, tripId, onClose, onUpdated }: Props) {
  const [notes, setNotes] = useState(stop.notes ?? '');
  const [timeOfDay, setTimeOfDay] = useState(stop.timeOfDay ?? '');
  const [saving, setSaving] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => updateStop(tripId, stop.id, { notes, timeOfDay: timeOfDay || undefined }),
    onSuccess: () => { setSaving(false); onUpdated(); },
    onError:   () => setSaving(false),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteStop(tripId, stop.id),
    onSuccess: () => { onClose(); onUpdated(); },
  });

  const handleSave = () => { setSaving(true); updateMutation.mutate(); };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.typeIcon}>{STOP_TYPE_ICONS[stop.stopType] ?? '📍'}</span>
          <div style={styles.headerInfo}>
            <div style={styles.name}>{stop.name}</div>
            {stop.formattedAddress && (
              <div style={styles.address}>{stop.formattedAddress}</div>
            )}
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Ratings */}
        {stop.googleRating != null && (
          <div style={styles.section}>
            <StarRating rating={stop.googleRating} />
            {stop.priceLevel != null && (
              <span style={styles.priceLevel}>{'$'.repeat(stop.priceLevel + 1)}</span>
            )}
          </div>
        )}

        {/* Thumbnail */}
        {stop.thumbnailUrl && (
          <div style={styles.thumbWrap}>
            <img src={stop.thumbnailUrl} style={styles.thumb} alt={stop.name} />
          </div>
        )}

        {/* Source */}
        {stop.sourceJobId && (
          <div style={styles.sourceNote}>
            Extracted from a video · {stop.sourceInsightType}
          </div>
        )}

        {/* Notes */}
        <div style={styles.field}>
          <label style={styles.label}>Notes</label>
          <textarea
            style={styles.textarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes…"
            rows={3}
          />
        </div>

        {/* Time */}
        <div style={styles.field}>
          <label style={styles.label}>Time</label>
          <input
            style={styles.input}
            type="text"
            value={timeOfDay}
            onChange={e => setTimeOfDay(e.target.value)}
            placeholder="e.g. 09:00 or morning"
          />
        </div>

        {/* Price */}
        {stop.priceEstimate != null && (
          <div style={styles.priceRow}>
            <span style={styles.label}>Estimated cost</span>
            <span style={styles.priceVal}>{stop.currency ?? ''} {stop.priceEstimate.toLocaleString()}</span>
          </div>
        )}

        {/* Affiliate links */}
        <AffiliateBookingRow stopId={stop.id} stopType={stop.stopType} tripId={tripId} />

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.deleteBtn} onClick={() => {
            if (confirm('Delete this stop?')) deleteMutation.mutate();
          }}>
            Delete stop
          </button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay:    { position: 'fixed', inset: 0, background: '#00000070', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  panel:      { background: '#0f1117', border: '1px solid #1e293b', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', padding: 20 },
  header:     { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  typeIcon:   { fontSize: 28, flexShrink: 0 },
  headerInfo: { flex: 1 },
  name:       { fontSize: 16, fontWeight: 700, color: '#f1f5f9' },
  address:    { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn:   { background: 'none', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer', padding: 4 },
  section:    { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  priceLevel: { fontSize: 13, color: '#4ade80' },
  thumbWrap:  { borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  thumb:      { width: '100%', height: 160, objectFit: 'cover' },
  sourceNote: { fontSize: 11, color: '#64748b', background: '#1e293b', borderRadius: 6, padding: '6px 10px', marginBottom: 12 },
  field:      { marginBottom: 12 },
  label:      { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 },
  textarea:   { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' },
  input:      { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '8px 10px', boxSizing: 'border-box' },
  priceRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priceVal:   { fontSize: 14, fontWeight: 600, color: '#4ade80' },
  actions:    { display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' },
  deleteBtn:  { background: 'none', border: '1px solid #f8717140', color: '#f87171', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
  saveBtn:    { flex: 1, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
