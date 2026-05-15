// apps/ui/src/pages/BrowsePage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getContent, getCountries } from '../api';
import ContentCard from '../components/ContentCard';
import ContentDetail from '../components/ContentDetails';
import type { ContentItem } from '../types';
import React from 'react';

const TYPES = ['all', 'reel', 'vlog', 'short'];

export default function BrowsePage() {
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<ContentItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['content', filter, search],
    queryFn:  () => getContent({
      contentType: filter === 'all' ? undefined : filter,
      search:      search || undefined,
      limit:       50,
    }),
  });

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn:  getCountries,
  });

  const grouped = groupByCountry(data?.items ?? [], countries ?? []);

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            Browse
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>
            {data?.total ?? 0} videos indexed
          </p>
        </div>
        <input
          placeholder="Search creators, captions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 13px', border: '1.5px solid var(--border-md)',
            borderRadius: 'var(--radius-lg)', fontSize: 13, width: 230,
            outline: 'none', background: '#FFFFFF', fontFamily: 'var(--font-body)',
            boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = '#0D9488')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-md)')}
        />
      </div>

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding:      '6px 16px',
              borderRadius: 20,
              border:       `1.5px solid ${filter === t ? '#0D9488' : 'var(--border)'}`,
              background:   filter === t ? '#F0FDFB' : '#FFFFFF',
              color:        filter === t ? '#0F766E' : 'var(--text-2)',
              fontSize:     12,
              fontWeight:   filter === t ? 600 : 400,
              fontFamily:   'var(--font-ui)',
              cursor:       'pointer',
              transition:   'all .15s',
              boxShadow:    filter === t ? '0 2px 8px rgba(13,148,136,0.12)' : 'var(--shadow-sm)',
            }}
          >
            {t === 'all' ? 'All types' : t}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '40px 0', textAlign: 'center' }}>
          Loading…
        </div>
      )}

      {grouped.map(group => (
        <div key={group.code} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>{group.flag}</span>
            <span style={{
              fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15,
              letterSpacing: '-0.01em', color: 'var(--text-1)',
            }}>
              {group.name}
            </span>
            <span style={{
              background: '#FFFFFF', border: '1.5px solid var(--border)',
              borderRadius: 20, padding: '1px 9px',
              fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', fontWeight: 500,
              boxShadow: 'var(--shadow-sm)',
            }}>
              {group.items.length}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
            {group.items.map(item => (
              <ContentCard key={item.jobId} item={item} onClick={setSelected} />
            ))}
          </div>

          <div style={{ height: '1px', background: 'var(--border)', margin: '28px 0 4px', opacity: 0.6 }} />
        </div>
      ))}

      {selected && (
        <ContentDetail item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function groupByCountry(
  items: ContentItem[],
  countries: { country: string; countryCode: string; count: number }[]
) {
  const map = new Map<string, ContentItem[]>();
  items.forEach(item => {
    const key = item.country ?? 'Unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });

  return Array.from(map.entries()).map(([name, its]) => {
    const meta = countries.find(c => c.country === name);
    return {
      code:  meta?.countryCode ?? 'xx',
      flag:  meta?.countryCode ? countryFlag(meta.countryCode) : '🌐',
      name,
      items: its,
    };
  });
}

function countryFlag(code: string) {
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}
