import React from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { TripDetail, TripDay, TripStop } from '../types';
import { reorderStops, generateShareToken } from '../api';

const STOP_COLORS: Record<string, string> = {
  stay: '#185FA5', place: '#534AB7', food: '#993C1D',
  activity: '#3B6D11', transport: '#888780',
};

const STOP_ICONS: Record<string, string> = {
  stay: '🏨', place: '📍', food: '🍜', activity: '🎭', transport: '🚆',
};

interface Props {
  trip:           TripDetail;
  selectedDay:    number | 'all';
  selectedStopId: string | null;
  onDayChange:    (day: number | 'all') => void;
  onStopSelect:   (stopId: string) => void;
  onBulkImport?:  () => void;
  onRefresh?:     () => void;
  readOnly?:      boolean;
}

export default function TripSidebar({
  trip, selectedDay, selectedStopId,
  onDayChange, onStopSelect,
  onBulkImport, onRefresh, readOnly = false,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: () => generateShareToken(trip.id),
    onSuccess: ({ shareUrl }) => {
      navigator.clipboard?.writeText(`${window.location.origin}${shareUrl}`).catch(() => {});
      alert(`Share link copied to clipboard!`);
    },
  });

  const days = Array.from({ length: trip.dayCount }, (_, i) => i + 1);

  const visibleDays: TripDay[] = selectedDay === 'all'
    ? Object.values(trip.days)
    : Object.values(trip.days).filter(d => d.dayNumber === selectedDay);

  return (
    <div style={styles.sidebar}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/trips')}>←</button>
        <div style={styles.tripInfo}>
          <div style={styles.tripTitle}>{trip.title}</div>
          <div style={styles.tripMeta}>{trip.country} · {trip.dayCount} days</div>
        </div>
        {!readOnly && (
          <button style={styles.shareBtn} onClick={() => shareMutation.mutate()} title="Share trip">
            ↗
          </button>
        )}
      </div>

      {/* Day tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(selectedDay === 'all' ? styles.tabActive : {}) }}
          onClick={() => onDayChange('all')}
        >
          All
        </button>
        {days.map(d => (
          <button
            key={d}
            style={{ ...styles.tab, ...(selectedDay === d ? styles.tabActive : {}) }}
            onClick={() => onDayChange(d)}
          >
            Day {d}
          </button>
        ))}
      </div>

      {/* Import button */}
      {!readOnly && onBulkImport && (
        <button style={styles.importBtn} onClick={onBulkImport}>
          + Import from video
        </button>
      )}

      {/* Stop list */}
      <div style={styles.stopList}>
        {visibleDays.length === 0 ? (
          <p style={styles.empty}>No stops yet. Add one to get started.</p>
        ) : (
          visibleDays.map(day => (
            <DaySection
              key={day.dayNumber}
              day={day}
              tripId={trip.id}
              selectedStopId={selectedStopId}
              onStopSelect={onStopSelect}
              onRefresh={onRefresh}
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DaySection({ day, tripId, selectedStopId, onStopSelect, onRefresh, readOnly }: {
  day:            TripDay;
  tripId:         string;
  selectedStopId: string | null;
  onStopSelect:   (id: string) => void;
  onRefresh?:     () => void;
  readOnly:       boolean;
}) {
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor));

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderStops(tripId, day.dayNumber, orderedIds),
    onSuccess: () => onRefresh?.(),
  });

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const stops = day.stops;
    const oldIdx = stops.findIndex(s => s.id === active.id);
    const newIdx = stops.findIndex(s => s.id === over.id);
    const reordered = arrayMove(stops, oldIdx, newIdx);
    reorderMutation.mutate(reordered.map(s => s.id));
  };

  return (
    <div style={styles.daySection}>
      <div style={styles.dayLabel}>{day.title}</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={day.stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {day.stops.map(stop => (
            <SortableStopRow
              key={stop.id}
              stop={stop}
              isSelected={stop.id === selectedStopId}
              onClick={() => onStopSelect(stop.id)}
              readOnly={readOnly}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableStopRow({ stop, isSelected, onClick, readOnly }: {
  stop:       TripStop;
  isSelected: boolean;
  onClick:    () => void;
  readOnly:   boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stop.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...styles.stopRow, ...(isSelected ? styles.stopRowActive : {}) }}
      onClick={onClick}
    >
      {!readOnly && (
        <span style={styles.dragHandle} {...attributes} {...listeners}>⋮⋮</span>
      )}
      <span style={{ ...styles.stopDot, background: STOP_COLORS[stop.stopType] ?? '#534AB7' }}>
        {stop.position}
      </span>
      <div style={styles.stopInfo}>
        <span style={styles.stopIcon}>{STOP_ICONS[stop.stopType] ?? '📍'}</span>
        <div>
          <div style={styles.stopName}>{stop.name}</div>
          {stop.timeOfDay && <div style={styles.stopTime}>{stop.timeOfDay}</div>}
        </div>
      </div>
      <div style={styles.stopRight}>
        {stop.priceEstimate != null && (
          <span style={styles.price}>{stop.currency ?? ''} {stop.priceEstimate.toLocaleString()}</span>
        )}
        {!stop.isGeocoded && <span style={styles.geocodingBadge}>…</span>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar:        { width: 300, background: '#0f1117', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 },
  header:         { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 10px', borderBottom: '1px solid #1e293b' },
  backBtn:        { background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', padding: '4px 6px' },
  tripInfo:       { flex: 1, overflow: 'hidden' },
  tripTitle:      { fontSize: 13, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tripMeta:       { fontSize: 11, color: '#64748b', marginTop: 2 },
  shareBtn:       { background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 14 },
  tabs:           { display: 'flex', overflowX: 'auto', padding: '10px 14px', gap: 6, borderBottom: '1px solid #1e293b', scrollbarWidth: 'none' },
  tab:            { background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  tabActive:      { background: '#534AB7', color: '#fff' },
  importBtn:      { margin: '10px 14px 0', background: 'none', border: '1px dashed #334155', color: '#94a3b8', borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer', width: 'calc(100% - 28px)', textAlign: 'center' },
  stopList:       { flex: 1, overflowY: 'auto', padding: '10px 0' },
  empty:          { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 40 },
  daySection:     { marginBottom: 8 },
  dayLabel:       { fontSize: 11, fontWeight: 700, color: '#64748b', padding: '6px 14px 4px', textTransform: 'uppercase', letterSpacing: 1 },
  stopRow:        { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer', borderRadius: 8, margin: '2px 6px', transition: 'background 0.15s' },
  stopRowActive:  { background: '#1e293b' },
  dragHandle:     { color: '#334155', fontSize: 12, cursor: 'grab', userSelect: 'none', flexShrink: 0 },
  stopDot:        { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 },
  stopInfo:       { flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' },
  stopIcon:       { fontSize: 14, flexShrink: 0 },
  stopName:       { fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  stopTime:       { fontSize: 11, color: '#64748b' },
  stopRight:      { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  price:          { fontSize: 11, color: '#4ade80' },
  geocodingBadge: { fontSize: 10, color: '#64748b', background: '#1e293b', borderRadius: 4, padding: '2px 4px' },
};
