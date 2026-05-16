import React, { useState } from 'react';
import { usePlaceDetails } from '../hooks/usePlaceDetails';
import { PlacePhotos } from './PlacePhotos';
import { PlaceInfoRows } from './PlaceInfoRows';
import { CommunityNotes } from './CommunityNotes';
import { PlaceSources } from './PlaceSources';
import AffiliateBookingRow from './AffiliateBookingRow';

type Tab = 'overview' | 'notes' | 'sources' | 'book';

interface Props {
  googlePlaceId: string;
  tripStopId?:   string;
  tripId?:       string;
  stopType:      string;
  stopName:      string;
  onClose:       () => void;
  onViewContent?: (jobId: string) => void;
}

const STOP_ICON: Record<string, string> = {
  stay:      '🏨',
  food:      '🍜',
  place:     '📍',
  activity:  '🎭',
  transport: '🚆',
};

export function PlaceDetailSheet({
  googlePlaceId, tripStopId, tripId, stopType, stopName, onClose, onViewContent,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: place, isLoading, error } = usePlaceDetails(googlePlaceId, tripStopId);

  const is404 = (error as any)?.response?.status === 404;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 1001, background: '#0f1117',
        borderRadius: '16px 16px 0 0',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        // Right panel on wide screens
        ...(window.innerWidth >= 768 ? {
          left: 'auto', right: 0, top: 0, bottom: 0,
          borderRadius: 0, width: 420, maxHeight: '100vh',
          borderLeft: '1px solid #1e293b',
        } : {}),
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#334155' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{STOP_ICON[stopType] ?? '📍'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
              {place?.name ?? stopName}
            </h2>
            {place?.placeType && (
              <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0', textTransform: 'capitalize' }}>
                {place.placeType}
              </p>
            )}
            {place?.rating != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{ color: '#fbbf24', fontSize: 13 }}>★ {place.rating.toFixed(1)}</span>
                {place.userRatingsTotal != null && (
                  <span style={{ color: '#64748b', fontSize: 11 }}>
                    ({place.userRatingsTotal.toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: 20, padding: 4, flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', margin: '12px 0 0' }}>
          {(['overview', 'notes', 'sources', 'book'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 4px',
                color: activeTab === tab ? '#818cf8' : '#64748b',
                fontSize: 12, fontWeight: activeTab === tab ? 700 : 400,
                borderBottom: activeTab === tab ? '2px solid #818cf8' : '2px solid transparent',
                textTransform: 'capitalize', transition: 'color 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Loading / 404 states */}
          {isLoading && (
            <PlaceSkeleton name={stopName} />
          )}

          {!isLoading && is404 && (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Fetching place details… this takes a few seconds
              </p>
              <div style={{ marginTop: 8, color: '#4b5280', fontSize: 12 }}>
                (retrying automatically)
              </div>
            </div>
          )}

          {!isLoading && place && (
            <>
              {activeTab === 'overview' && (
                <>
                  <PlacePhotos
                    photos={place.photos}
                    primaryUrl={place.primaryPhotoUrl}
                    placeName={place.name}
                  />
                  {place.editorialSummary && (
                    <p style={{ color: '#94a3b8', fontSize: 13, padding: '12px 16px 0', lineHeight: 1.6, margin: 0 }}>
                      {place.editorialSummary}
                    </p>
                  )}
                  <PlaceInfoRows
                    openingHours={place.openingHours}
                    formattedAddress={place.formattedAddress}
                    phoneNumber={place.phoneNumber}
                    website={place.website}
                    googleMapsUrl={place.googleMapsUrl}
                    priceLevel={place.priceLevel}
                    priceLevelLabel={place.priceLevelLabel}
                    latitude={place.latitude}
                    longitude={place.longitude}
                  />
                </>
              )}

              {activeTab === 'notes' && (
                <CommunityNotes
                  googlePlaceId={googlePlaceId}
                  tripId={tripId}
                  stopId={tripStopId}
                  notes={place.communityNotes}
                  privateNote={place.privateNote}
                  userNoteId={place.userNoteId}
                />
              )}

              {activeTab === 'sources' && (
                <PlaceSources
                  count={place.sources.count}
                  items={place.sources.items}
                  onViewContent={onViewContent}
                />
              )}

              {activeTab === 'book' && tripStopId && (
                <div style={{ padding: '16px' }}>
                  <AffiliateBookingRow stopId={tripStopId} stopType={stopType} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PlaceSkeleton({ name }: { name: string }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ width: '100%', height: 180, borderRadius: 8, background: '#1e293b', marginBottom: 12 }} />
      <div style={{ height: 16, width: '60%', borderRadius: 4, background: '#1e293b', marginBottom: 8 }} />
      <div style={{ height: 12, width: '40%', borderRadius: 4, background: '#1e293b', marginBottom: 8 }} />
      <div style={{ height: 12, width: '80%', borderRadius: 4, background: '#1e293b' }} />
      <p style={{ color: '#4b5280', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
        Fetching place details for "{name}"…
      </p>
    </div>
  );
}
