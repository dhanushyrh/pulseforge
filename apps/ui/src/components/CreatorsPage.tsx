// apps/ui/src/components/CreatorsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCreators, getContent } from '../api';
import ContentCard from './ContentCard';
import ContentDetail from './ContentDetails';
import type { ContentItem } from '../types';
import React from 'react';

const AVATAR_PALETTE = [
  { bg: '#F0FDFB', color: '#0F766E' },
  { bg: '#EFF6FF', color: '#1D4ED8' },
  { bg: '#FEF3C7', color: '#B45309' },
  { bg: '#FDF4FF', color: '#7E22CE' },
  { bg: '#FFF1F2', color: '#BE123C' },
];

export default function CreatorsPage() {
  const [selected,   setSelected]   = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ContentItem | null>(null);

  const { data: creators } = useQuery({
    queryKey: ['creators'],
    queryFn:  getCreators,
  });

  const { data: content } = useQuery({
    queryKey: ['content-creator', selected],
    queryFn:  () => getContent({ search: selected!, limit: 50 }),
    enabled:  !!selected,
  });

  const active = creators?.find(c => c.creator === selected);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          {selected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: 'var(--text-3)', padding: 0,
                  fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ← Creators
              </button>
              <span style={{ color: 'var(--border-md)' }}>/</span>
              {selected}
            </span>
          ) : 'Creators'}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
          {selected ? `${active?.count ?? 0} videos · ${active?.countries.join(', ')}` : `${creators?.length ?? 0} creators tracked`}
        </p>
      </div>

      {!selected ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          {(creators ?? []).map((c, i) => {
            const col      = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
            const initials = c.creator.replace('@', '').slice(0, 2).toUpperCase();
            const conf     = Math.round(c.avgConfidence * 100);

            return (
              <div
                key={c.creator}
                onClick={() => setSelected(c.creator)}
                style={{
                  background: '#FFFFFF', borderRadius: 'var(--radius-lg)',
                  padding: '16px', cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.16s ease, box-shadow 0.16s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: col.bg, color: col.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-ui)', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                      color: 'var(--text-1)', marginBottom: 2,
                    }}>
                      {c.creator}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
                      {c.count} video{c.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'flex', gap: 8, marginBottom: 12,
                  padding: '8px 10px', background: 'var(--bg)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {[
                    { label: 'Videos',    value: c.count       },
                    { label: 'Travel',    value: `${conf}%`    },
                    { label: 'Countries', value: c.countries.length },
                  ].map(stat => (
                    <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700,
                        color: 'var(--text-1)',
                      }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {c.contentTypes.map(t => (
                    <span key={t} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--bg)', color: 'var(--text-2)',
                      border: '1px solid var(--border)', fontFamily: 'var(--font-ui)', fontWeight: 500,
                    }}>
                      {t}
                    </span>
                  ))}
                  {c.countries.slice(0, 3).map(country => (
                    <span key={country} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      background: '#F0FDFB', color: '#0F766E',
                      border: '1px solid rgba(13,148,136,0.2)', fontFamily: 'var(--font-ui)', fontWeight: 500,
                    }}>
                      {country}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {active && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
              padding: '16px 18px',
              background: 'linear-gradient(135deg, #0F1B18 0%, #1A3030 100%)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(45,212,191,0.15)', color: '#2DD4BF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)',
              }}>
                {active.creator.replace('@', '').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 16,
                  color: '#F8FAFC', marginBottom: 3,
                }}>
                  {active.creator}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-ui)' }}>
                  {active.count} videos · {active.countries.join(', ')} · {Math.round(active.avgConfidence * 100)}% avg travel confidence
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
            {(content?.items ?? []).map(item => (
              <ContentCard key={item.jobId} item={item} onClick={setDetailItem} />
            ))}
          </div>
        </div>
      )}

      {detailItem && (
        <ContentDetail item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  );
}
