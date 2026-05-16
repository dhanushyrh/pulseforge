import React, { useState } from 'react';
import type { PlacePhoto } from '../types';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — import.meta.env is valid in Vite
const MAPS_KEY: string = (window as any).__GOOGLE_MAPS_KEY__ || import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || '';

function photoUrl(ref: string, maxwidth = 800) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${MAPS_KEY}`;
}

function resolveUrl(photo: PlacePhoto, maxwidth = 800) {
  return photo.cachedUrl
    ? `/${photo.cachedUrl}`
    : photoUrl(photo.photoReference, maxwidth);
}

interface Props {
  photos:         PlacePhoto[];
  primaryUrl:     string | null;
  placeName:      string;
}

export function PlacePhotos({ photos, primaryUrl, placeName }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const heroSrc = primaryUrl?.startsWith('pulseforge-media/')
    ? `/${primaryUrl}`
    : primaryUrl;

  const strip = photos.slice(0, 5);
  const extra = photos.length > 5 ? photos.length - 5 : 0;

  return (
    <>
      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', height: 200, background: '#1e2230', flexShrink: 0 }}>
        {heroSrc ? (
          <img
            src={heroSrc}
            alt={placeName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #1e2230 0%, #2d3450 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#4b5280', fontSize: 14,
          }}>
            No photo available
          </div>
        )}
      </div>

      {/* Strip */}
      {strip.length > 0 && (
        <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto' }}>
          {strip.map((p, i) => (
            <div
              key={p.photoReference}
              onClick={() => setLightbox(i)}
              style={{
                flexShrink: 0, width: 64, height: 48, borderRadius: 6,
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
                background: '#1e2230',
              }}
            >
              <img
                src={resolveUrl(p, 200)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {i === strip.length - 1 && extra > 0 && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                }}>
                  +{extra}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(l => l! > 0 ? l! - 1 : photos.length - 1); }}
            style={arrowBtn}
          >‹</button>
          <img
            src={resolveUrl(photos[lightbox], 1600)}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(l => l! < photos.length - 1 ? l! + 1 : 0); }}
            style={arrowBtn}
          >›</button>
        </div>
      )}
    </>
  );
}

const arrowBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
  fontSize: 32, width: 48, height: 48, borderRadius: '50%',
  cursor: 'pointer', margin: '0 16px', flexShrink: 0,
};
