// apps/ui/src/pages/BrowsePage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getContent, getCountries } from '../api';
import ContentCard from '../components/ContentCard';
import ContentDetail from '../components/ContentDetails';
import type { ContentItem } from '../types';
import React from 'react';

const TYPES = ['all','reel','vlog','short'];

export default function BrowsePage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
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

  // Group items by country
  const grouped = groupByCountry(data?.items ?? [], countries ?? []);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontSize:18, fontWeight:500 }}>Browse content</h1>
        <input
          placeholder="Search captions, creators..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding:'7px 12px', border:'0.5px solid var(--border-md)', borderRadius:'var(--radius-md)', fontSize:13, width:240, outline:'none', background:'var(--surface)' }}
        />
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:24 }}>
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding:      '5px 14px',
              borderRadius: 20,
              border:       `0.5px solid ${filter===t ? '#AFA9EC' : 'var(--border)'}`,
              background:   filter===t ? 'var(--purple-50)' : 'var(--surface)',
              color:        filter===t ? 'var(--purple-800)' : 'var(--text-2)',
              fontSize:     12,
              fontWeight:   filter===t ? 500 : 400,
              cursor:       'pointer',
              transition:   'all .15s',
            }}
          >
            {t === 'all' ? 'All types' : t}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ color:'var(--text-3)', fontSize:13 }}>Loading...</div>}

      {grouped.map(group => (
        <div key={group.code} style={{ marginBottom: 32 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <span style={{ fontSize:20 }}>{group.flag}</span>
            <span style={{ fontWeight:500, fontSize:14 }}>{group.name}</span>
            <span style={{
              background: 'var(--bg)',
              border:     '0.5px solid var(--border)',
              borderRadius: 20,
              padding:    '1px 8px',
              fontSize:   11,
              color:      'var(--text-3)',
            }}>
              {group.items.length}
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {group.items.map(item => (
              <ContentCard key={item.jobId} item={item} onClick={setSelected} />
            ))}
          </div>

          <div style={{ height:'0.5px', background:'var(--border)', margin:'24px 0 8px' }} />
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