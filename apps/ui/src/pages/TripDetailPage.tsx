import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTripDetail } from '../api';
import type { TripStop } from '../types';
import TripMap from '../components/TripMap';
import TripSidebar from '../components/TripSidebar';
import StopPopup from '../components/StopPopup';
import CreateTripModal from '../components/CreateTripModal';
import BulkImportModal from '../components/BulkImportModal';
import { PlaceDetailSheet } from '../components/PlaceDetailSheet';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [showStopPopup, setShowStopPopup] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [placeSheetStop, setPlaceSheetStop] = useState<{ stop: TripStop; tab?: 'overview' | 'book' } | null>(null);

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTripDetail(id!),
    refetchInterval: (query) => {
      // Poll if any stops are not geocoded yet
      const data = query.state.data;
      if (!data) return false;
      const allStops = Object.values(data.days).flatMap(d => d.stops);
      return allStops.some(s => !s.isGeocoded) ? 5000 : false;
    },
  });

  const selectedStop: TripStop | undefined = trip
    ? Object.values(trip.days).flatMap(d => d.stops).find(s => s.id === selectedStopId)
    : undefined;

  const handleStopSelect = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
    const stop = trip
      ? Object.values(trip.days).flatMap(d => d.stops).find(s => s.id === stopId)
      : undefined;
    if (stop?.googlePlaceId) {
      setPlaceSheetStop({ stop });
    } else {
      setShowStopPopup(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  const handleShowDetails = useCallback((stop: TripStop, tab?: 'overview' | 'book') => {
    setSelectedStopId(stop.id);
    setPlaceSheetStop({ stop, tab });
  }, []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['trip', id] });

  if (isLoading) {
    return (
      <div style={styles.center}>
        <span style={styles.spinner}>↻</span> Loading trip…
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#f87171' }}>Trip not found.</p>
        <button style={styles.backBtn} onClick={() => navigate('/trips')}>← Back to trips</button>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <TripSidebar
        trip={trip}
        selectedDay={selectedDay}
        selectedStopId={selectedStopId}
        onDayChange={setSelectedDay}
        onStopSelect={handleStopSelect}
        onBulkImport={() => setShowBulkImport(true)}
        onRefresh={refresh}
      />

      {/* Map */}
      <div style={styles.mapArea}>
        <TripMap
          trip={trip}
          selectedDay={selectedDay}
          selectedStopId={selectedStopId}
          onStopSelect={handleStopSelect}
          onShowDetails={handleShowDetails}
        />
      </div>

      {/* Stop detail popup */}
      {showStopPopup && selectedStop && (
        <StopPopup
          stop={selectedStop}
          tripId={trip.id}
          onClose={() => setShowStopPopup(false)}
          onUpdated={refresh}
        />
      )}

      {/* Place Detail Sheet */}
      {placeSheetStop && placeSheetStop.stop.googlePlaceId && (
        <PlaceDetailSheet
          googlePlaceId={placeSheetStop.stop.googlePlaceId}
          tripStopId={placeSheetStop.stop.id}
          tripId={trip.id}
          stopType={placeSheetStop.stop.stopType}
          stopName={placeSheetStop.stop.name}
          onClose={() => setPlaceSheetStop(null)}
        />
      )}

      {/* Bulk import modal */}
      {showBulkImport && (
        <BulkImportModal
          tripId={trip.id}
          tripDayCount={trip.dayCount}
          onClose={() => setShowBulkImport(false)}
          onImported={refresh}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell:   { display: 'flex', height: '100vh', overflow: 'hidden' },
  mapArea: { flex: 1, position: 'relative' },
  center:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#94a3b8' },
  spinner: { fontSize: 24, display: 'inline-block', animation: 'spin 1s linear infinite' },
  backBtn: { background: 'none', border: '1px solid #1e293b', color: '#94a3b8', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' },
};
