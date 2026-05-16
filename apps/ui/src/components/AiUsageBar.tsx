import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAiUsage } from '../api';
import type { UsageStats } from '../types';

function barColor(pct: number): string {
  if (pct >= 80) return '#f87171';
  if (pct >= 60) return '#fbbf24';
  return '#6366f1';
}

// Full version — shown in the AI assistant panel header
export function AiUsageBar({ usage, compact }: { usage?: UsageStats; compact?: boolean }) {
  const { data: fetched, refetch } = useQuery({
    queryKey: ['ai-usage'],
    queryFn:  getAiUsage,
    enabled:  !usage,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onFocus = () => { if (!usage) refetch(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [usage, refetch]);

  const stats = usage ?? fetched;
  if (!stats) return null;

  const isUnlimited = stats.messages.limit === -1;
  const pct = isUnlimited ? 0 : Math.min(100, stats.messages.pct);
  const color = barColor(pct);

  const resetIn = (() => {
    const diff = new Date(stats.resetAt).getTime() - Date.now();
    const h    = Math.max(0, Math.floor(diff / 3_600_000));
    const m    = Math.max(0, Math.floor((diff % 3_600_000) / 60_000));
    return h > 0 ? `${h}h` : `${m}m`;
  })();

  if (compact) {
    return (
      <div style={{ padding: '6px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
          <span>AI messages</span>
          {isUnlimited
            ? <span style={{ color: '#4ade80' }}>Unlimited</span>
            : <span style={{ color: pct >= 80 ? '#f87171' : '#94a3b8' }}>
                {stats.messages.used}/{stats.messages.limit}
              </span>
          }
        </div>
        {!isUnlimited && (
          <>
            <div style={{ height: 3, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: color,
                borderRadius: 2, transition: 'width 0.4s',
                animation: pct >= 100 ? 'pulse 1.5s infinite' : undefined,
              }} />
            </div>
            {stats.messages.remaining <= 2 && stats.messages.remaining >= 0 && (
              <div style={{ fontSize: 10, color: '#f87171', marginTop: 3 }}>
                {stats.messages.remaining === 0
                  ? <a href="/settings/billing" style={{ color: '#818cf8', textDecoration: 'none' }}>Upgrade to Pro</a>
                  : `${stats.messages.remaining} left — resets in ${resetIn}`
                }
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0' }}>
      {/* Row 1: progress bar + counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, background: color,
            borderRadius: 3, transition: 'width 0.4s',
          }} />
        </div>
        <span style={{ fontSize: 12, color: pct >= 80 ? color : '#94a3b8', whiteSpace: 'nowrap' }}>
          {isUnlimited ? 'Unlimited' : `${stats.messages.used}/${stats.messages.limit} messages`}
        </span>
        {!isUnlimited && (
          <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
            resets in {resetIn}
          </span>
        )}
      </div>

      {/* Row 2: model badge + feature info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {stats.isDegraded ? (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#451a03', color: '#fbbf24' }}>
            Faster model active
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#052e16', color: '#4ade80' }}>
            Full AI
          </span>
        )}
        {stats.plan === 'free' && (
          <a href="/settings/billing" style={{ fontSize: 10, color: '#818cf8', textDecoration: 'none' }}>
            Upgrade to Pro
          </a>
        )}
      </div>
    </div>
  );
}
