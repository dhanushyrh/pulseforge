// apps/ui/src/components/ContentDetail.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getContentById } from '../api';
import type { ContentItem } from '../types';
import InsightsTabs from './InsightsTabs';
import React from 'react';

const TABS = ['overview','stays','places','food','budget','itinerary'] as const;
type Tab = typeof TABS[number];

export default function ContentDetail({
  item,
  onClose,
}: {
  item:    ContentItem;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const conf = Math.round((item.travelConfidence ?? 0) * 100);

  const { data: full } = useQuery({
    queryKey: ['content-detail', item.jobId],
    queryFn:  () => getContentById(item.jobId),
  });

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', width:'92%', maxWidth:560, maxHeight:'85vh', overflow:'hidden', display:'flex', flexDirection:'column' }}
      >
        {/* Header */}
        <div style={{ padding:'16px 18px 0', borderBottom:'0.5px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ flex:1, paddingRight:12 }}>
              <p style={{ fontWeight:500, fontSize:14, lineHeight:1.4, marginBottom:4 }}>{item.caption ?? item.url}</p>
              <div style={{ fontSize:12, color:'var(--text-2)', display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:'var(--purple-50)', color:'var(--purple-800)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:600 }}>
                  {(item.creator ?? '?')[0].toUpperCase()}
                </div>
                {item.creator ?? 'Unknown'} · {item.platform} · {item.country ?? 'Unknown'}
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', width:28, height:28, cursor:'pointer', fontSize:13, color:'var(--text-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:1, background:'var(--border)', borderRadius:'6px 6px 0 0', overflow:'hidden' }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex:       1,
                  padding:    '7px 4px',
                  fontSize:   11,
                  border:     'none',
                  cursor:     'pointer',
                  background: tab===t ? 'var(--surface)' : 'var(--bg)',
                  color:      tab===t ? 'var(--text-1)' : 'var(--text-2)',
                  fontWeight: tab===t ? 500 : 400,
                  transition: 'all .12s',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>
          <InsightsTabs
            tab={tab}
            item={full ?? item}
            jobId={item.jobId}
            conf={conf}
          />
        </div>
      </div>
    </div>
  );
}