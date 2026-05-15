// apps/ui/src/pages/CountryPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCountries, getContent } from '../api';
import ContentCard from '../components/ContentCard';
import ContentDetail from '../components/ContentDetails';
import type { ContentItem } from '../types';
import React from 'react';

export default function CountryPage() {
  const [selected,   setSelected]   = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ContentItem | null>(null);

  const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: getCountries });

  const { data } = useQuery({
    queryKey: ['content-country', selected],
    queryFn:  () => getContent({ country: selected!, limit: 50 }),
    enabled:  !!selected,
  });

  const active = countries?.find(c => c.countryCode === selected);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          Countries
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
          {countries?.length ?? 0} destinations indexed
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 18 }}>
        {/* Country list sidebar */}
        <div style={{
          background: '#FFFFFF', borderRadius: 'var(--radius-lg)',
          overflow: 'hidden', alignSelf: 'start',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {(countries ?? []).map(c => (
            <div
              key={c.countryCode}
              onClick={() => setSelected(c.countryCode)}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '10px 13px',
                borderBottom:   '1px solid var(--border)',
                cursor:         'pointer',
                background:     selected === c.countryCode ? '#F0FDFB' : '#FFFFFF',
                borderLeft:     selected === c.countryCode ? '2.5px solid #0D9488' : '2.5px solid transparent',
                transition:     'background .12s',
              }}
              onMouseEnter={e => {
                if (selected !== c.countryCode) e.currentTarget.style.background = '#FAFAF7';
              }}
              onMouseLeave={e => {
                if (selected !== c.countryCode) e.currentTarget.style.background = '#FFFFFF';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ fontSize: 17 }}>{countryFlag(c.countryCode)}</span>
                <span style={{
                  fontFamily: 'var(--font-ui)', fontWeight: selected === c.countryCode ? 600 : 400,
                  color: selected === c.countryCode ? '#0F766E' : 'var(--text-1)',
                }}>
                  {c.country}
                </span>
              </div>
              <span style={{
                fontSize: 11, color: selected === c.countryCode ? '#0D9488' : 'var(--text-3)',
                fontFamily: 'var(--font-ui)', fontWeight: 500,
              }}>
                {c.count}
              </span>
            </div>
          ))}
        </div>

        {/* Content area */}
        <div>
          {!selected ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 280,
              color: 'var(--text-3)', gap: 8,
            }}>
              <span style={{ fontSize: 32 }}>🌍</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}>Select a country to explore</span>
            </div>
          ) : active && (
            <>
              {/* Country header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 20, padding: '14px 18px',
                background: 'linear-gradient(135deg, #0F1B18 0%, #1A3030 100%)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
              }}>
                <span style={{ fontSize: 32 }}>{countryFlag(active.countryCode)}</span>
                <div>
                  <h2 style={{
                    fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 700,
                    color: '#F8FAFC', letterSpacing: '-0.01em', marginBottom: 3,
                  }}>
                    {active.country}
                  </h2>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-ui)' }}>
                    {active.count} video{active.count !== 1 ? 's' : ''} indexed · {data?.items.length ?? 0} loaded
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
                {(data?.items ?? []).map(item => (
                  <ContentCard key={item.jobId} item={item} onClick={setDetailItem} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {detailItem && <ContentDetail item={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  );
}

function countryFlag(code: string) {
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}
