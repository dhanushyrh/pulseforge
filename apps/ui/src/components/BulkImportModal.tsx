import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getContent, bulkImportStops } from '../api';
import type { ContentItem } from '../types';

interface Props {
  tripId:       string;
  tripDayCount: number;
  onClose:      () => void;
  onImported:   () => void;
}

type Step = 'select-source' | 'select-types';

const IMPORT_TYPES = [
  { key: 'stays',     label: 'Stays',     icon: '🏨' },
  { key: 'places',    label: 'Places',    icon: '📍' },
  { key: 'food',      label: 'Food',      icon: '🍜' },
  { key: 'itinerary', label: 'Itinerary', icon: '📋' },
];

export default function BulkImportModal({ tripId, tripDayCount, onClose, onImported }: Props) {
  const [step, setStep]               = useState<Step>('select-source');
  const [search, setSearch]           = useState('');
  const [selectedJob, setSelectedJob] = useState<ContentItem | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['stays', 'places', 'food', 'itinerary']);
  const [dayNumber, setDayNumber]     = useState(1);
  const [error, setError]             = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['content-search', search],
    queryFn: () => getContent({ search, limit: 10, status: 'completed' }),
    enabled: search.length > 0 || step === 'select-source',
  });

  const importMutation = useMutation({
    mutationFn: () => bulkImportStops(tripId, {
      jobId:     selectedJob!.jobId,
      dayNumber,
      types:     selectedTypes,
    }),
    onSuccess: (stops) => {
      alert(`${stops.length} stop${stops.length !== 1 ? 's' : ''} added to Day ${dayNumber}`);
      onImported();
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message ?? 'Import failed');
    },
  });

  const toggleType = (key: string) => {
    setSelectedTypes(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key],
    );
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Import from video</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {step === 'select-source' && (
          <>
            <p style={styles.hint}>Search your ingested videos and pick one to import stops from.</p>
            <input
              style={styles.search}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search videos, creators, countries…"
              autoFocus
            />

            <div style={styles.results}>
              {isLoading && <div style={styles.loading}>Searching…</div>}
              {data?.items.map(item => (
                <div
                  key={item.jobId}
                  style={{
                    ...styles.resultRow,
                    ...(selectedJob?.jobId === item.jobId ? styles.resultRowActive : {}),
                  }}
                  onClick={() => setSelectedJob(item)}
                >
                  <div style={styles.resultTitle}>{item.caption ?? item.url}</div>
                  <div style={styles.resultMeta}>
                    {item.creator && <span>{item.creator}</span>}
                    {item.country && <span>· {item.country}</span>}
                    <span>· {item.contentType}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              style={{ ...styles.nextBtn, opacity: selectedJob ? 1 : 0.4 }}
              disabled={!selectedJob}
              onClick={() => setStep('select-types')}
            >
              Next: Select what to import →
            </button>
          </>
        )}

        {step === 'select-types' && selectedJob && (
          <>
            <div style={styles.selectedSource}>
              <span style={styles.selectedLabel}>Source:</span>
              <span style={styles.selectedValue}>{selectedJob.caption ?? selectedJob.url}</span>
            </div>

            <p style={styles.hint}>What would you like to import?</p>
            <div style={styles.typeGrid}>
              {IMPORT_TYPES.map(t => (
                <button
                  key={t.key}
                  style={{
                    ...styles.typeBtn,
                    ...(selectedTypes.includes(t.key) ? styles.typeBtnActive : {}),
                  }}
                  onClick={() => toggleType(t.key)}
                >
                  <span style={styles.typeIcon}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Add to day</label>
              <select
                style={styles.select}
                value={dayNumber}
                onChange={e => setDayNumber(Number(e.target.value))}
              >
                {Array.from({ length: tripDayCount }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>Day {d}</option>
                ))}
              </select>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.actions}>
              <button style={styles.backBtn} onClick={() => setStep('select-source')}>← Back</button>
              <button
                style={{ ...styles.importBtn, opacity: selectedTypes.length ? 1 : 0.4 }}
                disabled={!selectedTypes.length || importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                {importMutation.isPending ? 'Importing…' : `Import ${selectedTypes.length} type(s) to Day ${dayNumber}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay:          { position: 'fixed', inset: 0, background: '#00000080', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal:            { background: '#0f1117', border: '1px solid #1e293b', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24, maxHeight: '85vh', overflowY: 'auto' },
  header:           { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:            { fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: 0 },
  closeBtn:         { background: 'none', border: 'none', color: '#64748b', fontSize: 16, cursor: 'pointer' },
  hint:             { fontSize: 13, color: '#94a3b8', marginBottom: 14 },
  search:           { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '10px 12px', marginBottom: 12, boxSizing: 'border-box' },
  results:          { maxHeight: 260, overflowY: 'auto', marginBottom: 14 },
  loading:          { color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 },
  resultRow:        { padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: '1px solid transparent', transition: 'all 0.15s' },
  resultRowActive:  { background: '#1e293b', border: '1px solid #534AB7' },
  resultTitle:      { fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  resultMeta:       { fontSize: 11, color: '#64748b', display: 'flex', gap: 6 },
  nextBtn:          { width: '100%', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  selectedSource:   { background: '#1e293b', borderRadius: 8, padding: '8px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' },
  selectedLabel:    { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' },
  selectedValue:    { fontSize: 12, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  typeGrid:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 },
  typeBtn:          { background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' },
  typeBtnActive:    { background: '#1e293b', border: '1px solid #534AB7', color: '#a5b4fc' },
  typeIcon:         { fontSize: 22 },
  field:            { marginBottom: 16 },
  label:            { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  select:           { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '10px 12px', boxSizing: 'border-box' },
  error:            { fontSize: 13, color: '#f87171', marginBottom: 14, padding: '8px 12px', background: '#f8717115', borderRadius: 8 },
  actions:          { display: 'flex', gap: 10 },
  backBtn:          { background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  importBtn:        { flex: 1, background: '#534AB7', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
