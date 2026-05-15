// apps/ui/src/pages/QueuePage.tsx
import { useQuery } from '@tanstack/react-query';
import { getContent } from '../api';
import React from 'react';

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  completed:  { color: '#047857', bg: '#ECFDF5', label: 'Completed'  },
  processing: { color: '#B45309', bg: '#FFFBEB', label: 'Processing' },
  failed:     { color: '#B91C1C', bg: '#FEF2F2', label: 'Failed'     },
  queued:     { color: '#1D4ED8', bg: '#EFF6FF', label: 'Queued'     },
  not_travel: { color: '#4B5563', bg: '#F3F4F6', label: 'Not travel' },
  pending:    { color: '#6B7280', bg: '#F9FAFB', label: 'Pending'    },
};

export default function QueuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn:  () => getContent({ limit: 50 }),
    refetchInterval: 5_000,
  });

  const items = data?.items ?? [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          Queue
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
          Live pipeline — refreshes every 5s
        </p>
      </div>

      {isLoading && (
        <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-ui)', padding: '40px 0', textAlign: 'center' }}>
          Loading…
        </div>
      )}

      <div style={{
        background: '#FFFFFF', borderRadius: 'var(--radius-lg)',
        overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        {items.map((item, i) => {
          const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
          return (
            <div
              key={item.jobId}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 16px',
                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Status dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cfg.color, flexShrink: 0,
                  boxShadow: item.status === 'processing'
                    ? `0 0 0 3px ${cfg.bg}`
                    : 'none',
                }} />
                <div>
                  <div style={{
                    fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                    color: 'var(--text-1)', marginBottom: 2, letterSpacing: '0.02em',
                  }}>
                    {item.jobId.slice(0, 8)}
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>
                      …{item.jobId.slice(-4)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--text-3)',
                    maxWidth: 360, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.url}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)',
                  color: cfg.color, background: cfg.bg,
                  padding: '3px 10px', borderRadius: 20,
                }}>
                  {cfg.label}
                </span>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', textAlign: 'right' }}>
                  {new Date(item.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && !isLoading && (
          <div style={{
            padding: '48px 0', textAlign: 'center',
            color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-ui)',
          }}>
            No jobs yet — ingest a URL to get started
          </div>
        )}
      </div>
    </div>
  );
}
