// apps/ui/src/components/IngestModal.tsx
import { useState } from 'react';
import { ingestUrl } from '../api';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

export default function IngestModal({ onClose }: { onClose: () => void }) {
  const [url,      setUrl]      = useState('');
  const [priority, setPriority] = useState<'low'|'high'>('low');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState<string | null>(null);
  const qc = useQueryClient();

  async function submit() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await ingestUrl({ url, priority });
      setDone(res.jobId);
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:22, width:440 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontSize:15, fontWeight:500 }}>Ingest URL</h2>
          <button onClick={onClose} style={{ background:'none', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', width:28, height:28, cursor:'pointer', fontSize:14, color:'var(--text-2)' }}>✕</button>
        </div>

        {done ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:24, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>Job queued</div>
            <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'monospace' }}>{done}</div>
            <button onClick={onClose} style={{ marginTop:16, padding:'8px 20px', background:'var(--purple-600)', color:'#fff', border:'none', borderRadius:'var(--radius-md)', cursor:'pointer', fontSize:13 }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:5 }}>URL</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{ width:'100%', padding:'9px 12px', border:'0.5px solid var(--border-md)', borderRadius:'var(--radius-md)', fontSize:13, outline:'none' }}
              />
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:5 }}>Priority</label>
              <div style={{ display:'flex', gap:8 }}>
                {(['low','high'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{ flex:1, padding:'7px', border:`0.5px solid ${priority===p ? '#AFA9EC' : 'var(--border)'}`, borderRadius:'var(--radius-md)', background: priority===p ? 'var(--purple-50)' : 'var(--surface)', color: priority===p ? 'var(--purple-800)' : 'var(--text-2)', fontSize:13, cursor:'pointer', fontWeight: priority===p ? 500 : 400 }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={submit}
              disabled={loading || !url.trim()}
              style={{ width:'100%', padding:'10px', background:'var(--purple-600)', color:'#fff', border:'none', borderRadius:'var(--radius-md)', fontWeight:500, cursor:'pointer', fontSize:13, opacity: loading || !url.trim() ? .6 : 1 }}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}