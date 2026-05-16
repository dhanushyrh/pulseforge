import React from 'react';
import type { PlaceSource } from '../types';

interface Props {
  count:   number;
  items:   PlaceSource[];
  onViewContent?: (jobId: string) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube:   '#ff0000',
  instagram: '#e1306c',
  tiktok:    '#010101',
  twitter:   '#1da1f2',
  other:     '#64748b',
};

function initials(name: string | null) {
  if (!name) return '?';
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function PlaceSources({ count, items, onViewContent }: Props) {
  if (count === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <p style={{ color: '#4b5280', fontSize: 14, margin: '0 0 6px' }}>No videos mention this place yet</p>
        <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>Ingest travel content to see sources here</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 12px' }}>
        {count} {count === 1 ? 'video mentions' : 'videos mention'} this place
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(src => (
          <div
            key={src.jobId}
            style={{
              background: '#111827', borderRadius: 10, padding: 12,
              border: '1px solid #1e293b',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: '#1e293b', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 700,
            }}>
              {initials(src.creator)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {src.creator && (
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                    {src.creator}
                  </span>
                )}
                <span style={{
                  background: PLATFORM_COLORS[src.platform] ?? '#334155',
                  color: '#fff', fontSize: 10, padding: '1px 6px',
                  borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {src.platform}
                </span>
              </div>

              {src.caption && (
                <p style={{
                  color: '#94a3b8', fontSize: 12, margin: '0 0 8px',
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {src.caption}
                </p>
              )}

              {onViewContent && (
                <button
                  onClick={() => onViewContent(src.jobId)}
                  style={{
                    background: 'none', border: '1px solid #334155',
                    borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                    color: '#818cf8', fontSize: 11,
                  }}
                >
                  View content ↗
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
