// apps/ui/src/pages/CreatorsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCreators, getContent } from '../api';
import ContentCard from '../components/ContentCard';
import ContentDetail from '../components/ContentDetails';
import type { ContentItem } from '../types';
import React from 'react';

const AVATAR_COLORS = [
  { bg:'#EEEDFE', color:'#3C3489' },
  { bg:'#E1F5EE', color:'#085041' },
  { bg:'#FAECE7', color:'#712B13' },
  { bg:'#FAEEDA', color:'#633806' },
  { bg:'#E6F1FB', color:'#0C447C' },
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
      <h1 style={{ fontSize:18, fontWeight:500, marginBottom:20 }}>Browse by creator</h1>

      {!selected ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
          {(creators ?? []).map((c, i) => {
            const col   = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const initials = c.creator.replace('@','').slice(0,2).toUpperCase();
            const conf  = Math.round(c.avgConfidence * 100);

            return (
              <div
                key={c.creator}
                onClick={() => setSelected(c.creator)}
                style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:14, cursor:'pointer', transition:'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:col.bg, color:col.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:500, flexShrink:0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{c.creator}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{c.count} video{c.count !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div style={{ display:'flex', gap:10, marginBottom:8, fontSize:11, color:'var(--text-2)' }}>
                  <span><b style={{ color:'var(--text-1)' }}>{c.count}</b> pieces</span>
                  <span><b style={{ color:'var(--text-1)' }}>{conf}%</b> travel</span>
                  <span><b style={{ color:'var(--text-1)' }}>{c.countries.length}</b> countries</span>
                </div>

                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {c.contentTypes.map(t => (
                    <span key={t} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'var(--bg)', color:'var(--text-2)', border:'0.5px solid var(--border)' }}>{t}</span>
                  ))}
                  {c.countries.slice(0, 3).map(country => (
                    <span key={country} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'var(--bg)', color:'var(--text-2)', border:'0.5px solid var(--border)' }}>{country}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelected(null)}
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-2)', background:'none', border:'none', cursor:'pointer', marginBottom:16, padding:0 }}
          >
            ← All creators
          </button>

          {active && (
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, padding:'14px 16px', background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:AVATAR_COLORS[0].bg, color:AVATAR_COLORS[0].color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:500 }}>
                {active.creator.replace('@','').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:500, fontSize:15 }}>{active.creator}</div>
                <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>
                  {active.count} videos · {active.countries.join(', ')} · {Math.round(active.avgConfidence * 100)}% avg confidence
                </div>
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
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