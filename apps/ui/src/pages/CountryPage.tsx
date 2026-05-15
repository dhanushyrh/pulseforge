// apps/ui/src/pages/CountryPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCountries, getContent } from '../api';
import ContentCard from '../components/ContentCard';
import ContentDetail from '../components/ContentDetails';
import type { ContentItem } from '../types';
import ContentDetails from '../components/ContentDetails';
import React from 'react';

export default function CountryPage() {
  const [selected, setSelected]     = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<ContentItem | null>(null);

  const { data: countries } = useQuery({ queryKey:['countries'], queryFn: getCountries });

  const { data } = useQuery({
    queryKey: ['content-country', selected],
    queryFn:  () => getContent({ country: selected!, limit: 50 }),
    enabled:  !!selected,
  });

  const active = countries?.find(c => c.countryCode === selected);

  return (
    <div>
      <h1 style={{ fontSize:18, fontWeight:500, marginBottom:20 }}>By country</h1>
      <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:16 }}>

        <div style={{ border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', alignSelf:'start' }}>
          {(countries ?? []).map(c => (
            <div
              key={c.countryCode}
              onClick={() => setSelected(c.countryCode)}
              style={{
                display:       'flex',
                alignItems:    'center',
                justifyContent:'space-between',
                padding:       '9px 12px',
                borderBottom:  '0.5px solid var(--border)',
                cursor:        'pointer',
                background:    selected===c.countryCode ? 'var(--purple-50)' : 'var(--surface)',
                borderLeft:    selected===c.countryCode ? '2px solid var(--purple-600)' : '2px solid transparent',
                transition:    'background .12s',
              }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:13 }}>
                <span style={{ fontSize:16 }}>{countryFlag(c.countryCode)}</span>
                {c.country}
              </div>
              <span style={{ fontSize:11, color:'var(--text-3)' }}>{c.count}</span>
            </div>
          ))}
        </div>

        <div>
          {!selected && (
            <div style={{ color:'var(--text-3)', fontSize:13, marginTop:40, textAlign:'center' }}>
              Select a country to browse its content
            </div>
          )}
          {selected && active && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <span style={{ fontSize:24 }}>{countryFlag(active.countryCode)}</span>
                <h2 style={{ fontSize:16, fontWeight:500 }}>{active.country}</h2>
                <span style={{ fontSize:12, color:'var(--text-3)' }}>{active.count} pieces</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
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