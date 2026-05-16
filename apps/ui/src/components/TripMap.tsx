import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import type { TripDetail, TripStop } from '../types';

const STOP_COLORS: Record<string, string> = {
  stay:      '#185FA5',
  place:     '#534AB7',
  food:      '#993C1D',
  activity:  '#3B6D11',
  transport: '#888780',
};

const DAY_COLORS = ['#534AB7', '#185FA5', '#3B6D11', '#993C1D', '#854F0B', '#085041'];

const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

const LIBRARIES: ('places')[] = ['places'];

interface Props {
  trip:             TripDetail;
  selectedDay:      number | 'all';
  selectedStopId:   string | null;
  onStopSelect:     (stopId: string) => void;
  onShowDetails?:   (stop: TripStop, tab?: 'overview' | 'book') => void;
}

export default function TripMap({ trip, selectedDay, selectedStopId, onStopSelect, onShowDetails }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [popupStop, setPopupStop] = useState<TripStop | null>(null);

  const allStops      = Object.values(trip.days).flatMap(d => d.stops);
  const geocodedStops = allStops.filter(s => s.isGeocoded && s.latitude != null && s.longitude != null);

  const visibleStops = selectedDay === 'all'
    ? geocodedStops
    : geocodedStops.filter(s => s.dayNumber === selectedDay);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current || !visibleStops.length) return;
    const bounds = new google.maps.LatLngBounds();
    visibleStops.forEach(s => bounds.extend({ lat: s.latitude!, lng: s.longitude! }));
    mapRef.current.fitBounds(bounds, 60);
  }, [selectedDay, geocodedStops.length]);

  const center = trip.centerLat && trip.centerLng
    ? { lat: trip.centerLat, lng: trip.centerLng }
    : { lat: 35.6762, lng: 139.6503 };

  const dayGroups: Record<number, TripStop[]> = {};
  for (const stop of visibleStops) {
    if (!dayGroups[stop.dayNumber]) dayGroups[stop.dayNumber] = [];
    dayGroups[stop.dayNumber].push(stop);
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — import.meta.env is valid in Vite
  const apiKey: string = (window as any).__GOOGLE_MAPS_KEY__ || import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || '';

  function handleMarkerClick(stop: TripStop) {
    onStopSelect(stop.id);
    setPopupStop(stop);
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={LIBRARIES}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={trip.defaultZoom ?? 11}
        onLoad={onLoad}
        onClick={() => setPopupStop(null)}
        options={{
          disableDefaultUI:  true,
          gestureHandling:   'greedy',
          styles:            MAP_STYLES,
          zoomControl:       true,
        }}
      >
        {/* Route polylines per day */}
        {Object.entries(dayGroups).map(([dayNum, stops]) => {
          const sorted = [...stops].sort((a, b) => a.position - b.position);
          const path   = sorted.map(s => ({ lat: s.latitude!, lng: s.longitude! }));
          const color  = DAY_COLORS[(parseInt(dayNum) - 1) % DAY_COLORS.length];
          return (
            <Polyline
              key={`poly-${dayNum}`}
              path={path}
              options={{ strokeColor: color, strokeOpacity: 0.6, strokeWeight: 2 }}
            />
          );
        })}

        {/* Markers */}
        {visibleStops.map(stop => (
          <Marker
            key={stop.id}
            position={{ lat: stop.latitude!, lng: stop.longitude! }}
            onClick={() => handleMarkerClick(stop)}
            label={{
              text:       stop.position.toString(),
              color:      '#fff',
              fontSize:   '11px',
              fontWeight: '700',
            }}
            icon={{
              path:        google.maps.SymbolPath.CIRCLE,
              scale:       14,
              fillColor:   STOP_COLORS[stop.stopType] ?? '#534AB7',
              fillOpacity: selectedStopId === stop.id ? 1 : 0.85,
              strokeColor: selectedStopId === stop.id ? '#fff' : 'transparent',
              strokeWeight: 2,
            }}
          />
        ))}

        {/* Rich popup InfoWindow */}
        {popupStop && popupStop.latitude != null && popupStop.longitude != null && (
          <InfoWindow
            position={{ lat: popupStop.latitude, lng: popupStop.longitude }}
            onCloseClick={() => setPopupStop(null)}
            options={{ pixelOffset: new google.maps.Size(0, -28) }}
          >
            <div style={{
              background: '#0f1117', borderRadius: 10, overflow: 'hidden',
              width: 220, fontFamily: 'system-ui, sans-serif',
              border: '1px solid #1e293b',
            }}>
              {/* Photo strip */}
              {popupStop.thumbnailUrl ? (
                <div style={{ width: '100%', height: 110, overflow: 'hidden' }}>
                  <img
                    src={popupStop.thumbnailUrl.startsWith('pulseforge-media/')
                      ? `/${popupStop.thumbnailUrl}`
                      : popupStop.thumbnailUrl}
                    alt={popupStop.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              ) : (
                <div style={{
                  width: '100%', height: 110,
                  background: `linear-gradient(135deg, ${STOP_COLORS[popupStop.stopType] ?? '#534AB7'}33 0%, #1e293b 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32,
                }}>
                  {({ stay: '🏨', food: '🍜', place: '📍', activity: '🎭', transport: '🚆' } as Record<string, string>)[popupStop.stopType] ?? '📍'}
                </div>
              )}

              <div style={{ padding: '10px 12px 12px' }}>
                <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>
                  {popupStop.name}
                </p>

                {popupStop.googleRating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                    <span style={{ color: '#fbbf24', fontSize: 12 }}>★ {popupStop.googleRating.toFixed(1)}</span>
                    <span style={{
                      background: STOP_COLORS[popupStop.stopType] ?? '#534AB7',
                      color: '#fff', fontSize: 10, padding: '1px 6px',
                      borderRadius: 4, textTransform: 'capitalize',
                    }}>
                      {popupStop.stopType}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6 }}>
                  {onShowDetails && (
                    <>
                      <button
                        onClick={() => { setPopupStop(null); onShowDetails(popupStop, 'overview'); }}
                        style={{
                          flex: 1, background: '#1d4ed8', border: 'none',
                          borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                          color: '#fff', fontSize: 11, fontWeight: 600,
                        }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => { setPopupStop(null); onShowDetails(popupStop, 'book'); }}
                        style={{
                          flex: 1, background: '#065f46', border: 'none',
                          borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                          color: '#fff', fontSize: 11, fontWeight: 600,
                        }}
                      >
                        Book now
                      </button>
                    </>
                  )}
                  {!onShowDetails && (
                    <button
                      onClick={() => setPopupStop(null)}
                      style={{
                        flex: 1, background: '#1e293b', border: 'none',
                        borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                        color: '#94a3b8', fontSize: 11,
                      }}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}
