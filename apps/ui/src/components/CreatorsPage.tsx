// apps/ui/src/components/CreatorsPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCreators, getCreatorByHandle } from '../api';
import ContentCard from './ContentCard';
import ContentDetail from './ContentDetails';
import CreatorAvatar from './CreatorAvatar';
import type { ContentItem, CreatorProfile } from '../types';

const PLATFORM_BADGE: Record<string, { bg: string; color: string }> = {
  instagram: { bg: '#FEF3F2', color: '#C0392B' },
  youtube:   { bg: '#FFF3F0', color: '#E74C3C' },
  tiktok:    { bg: '#F0F9FF', color: '#1A5276' },
  twitter:   { bg: '#EBF5FB', color: '#2874A6' },
  other:     { bg: '#F4F6F6', color: '#616A6B' },
};

function countryFlag(name: string): string {
  const MAP: Record<string, string> = {
    Japan: 'JP', Thailand: 'TH', Indonesia: 'ID', Italy: 'IT',
    Vietnam: 'VN', India: 'IN', Greece: 'GR', Mexico: 'MX',
    France: 'FR', Spain: 'ES', Portugal: 'PT', Morocco: 'MA',
    Turkey: 'TR', UAE: 'AE', Singapore: 'SG', Malaysia: 'MY',
    Philippines: 'PH', Australia: 'AU', Iceland: 'IS', Germany: 'DE',
    'South Korea': 'KR', Taiwan: 'TW', 'Hong Kong': 'HK', 'New Zealand': 'NZ',
    'Sri Lanka': 'LK', Nepal: 'NP', Maldives: 'MV', Cambodia: 'KH',
    Peru: 'PE', Switzerland: 'CH', Austria: 'AT', Croatia: 'HR',
  };
  const code = MAP[name];
  if (!code) return name.slice(0, 2);
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}

export default function CreatorsPage() {
  const [selected,   setSelected]   = useState<CreatorProfile | null>(null);
  const [detailItem, setDetailItem] = useState<ContentItem | null>(null);

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['creators'],
    queryFn:  getCreators,
  });

  const { data: creatorDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['creator-detail', selected?.handle],
    queryFn:  () => getCreatorByHandle(selected!.handle),
    enabled:  !!selected,
  });

  if (!selected) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 700,
            letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            Creators
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
            {isLoading ? 'Loading…' : `${creators.length} creators tracked`}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {creators.map(c => (
            <CreatorCard key={c.id} creator={c} onClick={() => setSelected(c)} />
          ))}
        </div>
      </div>
    );
  }

  // Detail view — use creatorDetail when loaded, fall back to selected while loading
  const c = creatorDetail ?? selected;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.02em', marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: 'var(--text-3)', padding: 0,
              fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ← All creators
          </button>
          <span style={{ color: 'var(--border-md)' }}>/</span>
          {c.handle}
        </h1>
      </div>

      {/* Creator header card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <CreatorAvatar avatarUrl={c.avatarUrl} handle={c.handle} size={56} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{
                fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 16,
                color: 'var(--text-1)',
              }}>
                {c.displayName || c.handle}
              </span>
              {(() => {
                const badge = PLATFORM_BADGE[c.platform] ?? PLATFORM_BADGE.other;
                return (
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 20,
                    background: badge.bg, color: badge.color,
                    fontFamily: 'var(--font-ui)', fontWeight: 600,
                  }}>
                    {c.platform}
                  </span>
                );
              })()}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', marginBottom: 8 }}>
              {c.handle}
            </div>

            {c.bio && (
              <p style={{
                fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic',
                lineHeight: 1.5, marginBottom: 12, maxWidth: 560,
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {c.bio}
              </p>
            )}

            {c.profileUrl && (
              <a
                href={c.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12, color: 'var(--accent)',
                  display: 'inline-block', marginBottom: 12,
                }}
              >
                View on {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)} ↗
              </a>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Videos',     value: c.videoCount },
                { label: 'Countries',  value: c.topCountries.length },
                { label: 'Confidence', value: `${Math.round(c.avgTravelConfidence * 100)}%` },
                { label: 'Types',      value: c.contentTypes.join(', ') || '—' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{
                    fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 700,
                    color: 'var(--text-1)',
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    fontSize: 10, color: 'var(--text-3)',
                    fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Topics covered */}
        {c.topEntities.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 8,
            }}>
              Topics covered
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.topEntities.slice(0, 15).map(e => (
                <span key={e} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: 'var(--bg)', color: 'var(--text-2)',
                  border: '1px solid var(--border)', fontFamily: 'var(--font-ui)',
                }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Videos grid */}
      <div>
        <div style={{
          fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 14,
        }}>
          {detailLoading ? 'Loading videos…' : `${creatorDetail?.videos.length ?? 0} videos`}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: 12,
        }}>
          {(creatorDetail?.videos ?? []).map(item => (
            <ContentCard key={item.jobId} item={item} onClick={setDetailItem} />
          ))}
        </div>
      </div>

      {detailItem && (
        <ContentDetail item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}

/* ── Creator card (grid view) ── */
function CreatorCard({
  creator,
  onClick,
}: {
  creator: CreatorProfile;
  onClick: () => void;
}) {
  const conf    = Math.round(creator.avgTravelConfidence * 100);
  const badge   = PLATFORM_BADGE[creator.platform] ?? PLATFORM_BADGE.other;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF', borderRadius: 'var(--radius-lg)',
        padding: '16px', cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform     = 'translateY(-2px)';
        e.currentTarget.style.boxShadow    = 'var(--shadow-md)';
        e.currentTarget.style.borderColor  = 'var(--accent)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform     = 'translateY(0)';
        e.currentTarget.style.boxShadow    = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor  = 'var(--border)';
      }}
    >
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <CreatorAvatar avatarUrl={creator.avatarUrl} handle={creator.handle} size={40} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
            color: 'var(--text-1)', marginBottom: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {creator.displayName || creator.handle}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
            {creator.handle}
          </div>
        </div>
      </div>

      {/* Platform badge */}
      <div style={{ marginBottom: 10 }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20,
          background: badge.bg, color: badge.color,
          fontFamily: 'var(--font-ui)', fontWeight: 600,
        }}>
          {creator.platform}
        </span>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 10,
        background: 'var(--bg)', borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        {[
          { label: 'Videos',   value: creator.videoCount },
          { label: 'Conf',     value: `${conf}%` },
          { label: 'Countries', value: creator.topCountries.length },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: '6px 4px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700,
              color: 'var(--text-1)',
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Content type pills */}
      {creator.contentTypes.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {creator.contentTypes.map(t => (
            <span key={t} style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 20,
              background: 'var(--bg)', color: 'var(--text-2)',
              border: '1px solid var(--border)', fontFamily: 'var(--font-ui)',
            }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Top countries as flags */}
      {creator.topCountries.length > 0 && (
        <div style={{ fontSize: 16, letterSpacing: 3 }}>
          {creator.topCountries.slice(0, 4).map(countryFlag).join(' ')}
        </div>
      )}
    </div>
  );
}
