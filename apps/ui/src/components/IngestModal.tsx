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
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 27, 24, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 24px 22px',
          width: 440,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
              Ingest URL
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
              Paste a YouTube, Instagram, or TikTok URL
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%',
              width: 30, height: 30, cursor: 'pointer', fontSize: 14,
              color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, marginBottom: 6,
            }}>
              Job queued successfully
            </div>
            <div style={{
              fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace',
              background: 'var(--bg)', padding: '6px 12px', borderRadius: 'var(--radius-md)',
              display: 'inline-block', marginBottom: 18,
            }}>
              {done}
            </div>
            <br />
            <button
              onClick={onClose}
              style={{
                padding: '9px 24px', background: '#0D9488', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                fontSize: 13, fontFamily: 'var(--font-ui)', fontWeight: 600,
                boxShadow: '0 2px 8px rgba(13,148,136,0.35)',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6,
                fontFamily: 'var(--font-ui)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                URL
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: '100%', padding: '10px 13px',
                  border: '1.5px solid var(--border-md)', borderRadius: 'var(--radius-md)',
                  fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.15s',
                  background: '#FEFCF8',
                }}
                onFocus={e => (e.target.style.borderColor = '#0D9488')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-md)')}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6,
                fontFamily: 'var(--font-ui)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Priority
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['low', 'high'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      flex: 1, padding: '8px',
                      border: `1.5px solid ${priority === p ? '#0D9488' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: priority === p ? '#F0FDFB' : '#FEFCF8',
                      color: priority === p ? '#0F766E' : 'var(--text-2)',
                      fontSize: 13, cursor: 'pointer', fontWeight: priority === p ? 600 : 400,
                      fontFamily: 'var(--font-ui)', transition: 'all 0.12s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p === 'high' ? '⚡ ' : ''}{p}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={submit}
              disabled={loading || !url.trim()}
              style={{
                width: '100%', padding: '11px',
                background: '#0D9488', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontWeight: 600, cursor: 'pointer', fontSize: 13,
                fontFamily: 'var(--font-ui)',
                opacity: loading || !url.trim() ? 0.55 : 1,
                boxShadow: loading || !url.trim() ? 'none' : '0 2px 8px rgba(13,148,136,0.35)',
                transition: 'opacity 0.15s, box-shadow 0.15s',
              }}
            >
              {loading ? 'Submitting…' : '→ Start pipeline'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
