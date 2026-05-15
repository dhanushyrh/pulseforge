// apps/ui/src/pages/QueuePage.tsx
import { useQuery } from '@tanstack/react-query';
import { getContent } from '../api';
import React from 'react';

const STATUS_COLOR: Record<string, string> = {
  completed:  '#639922',
  processing: '#EF9F27',
  failed:     '#E24B4A',
  queued:     '#534AB7',
  not_travel: '#a0a09c',
};

export default function QueuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn:  () => getContent({ limit: 50 }),
    refetchInterval: 5_000,
  });

  return (
    <div>
      <h1 style={{ fontSize:18, fontWeight:500, marginBottom:20 }}>Queue</h1>
      {isLoading && <div style={{ color:'var(--text-3)', fontSize:13 }}>Loading...</div>}
      {(data?.items ?? []).map(item => (
        <div
          key={item.jobId}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'0.5px solid var(--border)' }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background: STATUS_COLOR[item.status] ?? '#ccc', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:500, fontFamily:'monospace' }}>{item.jobId.slice(0,8)}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', maxWidth:360, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.url}</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12, fontWeight:500, color: STATUS_COLOR[item.status] ?? 'var(--text-2)' }}>{item.status}</div>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(item.createdAt).toLocaleTimeString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}