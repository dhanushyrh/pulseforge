// apps/ui/src/components/ContentDetail.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getContentById } from '../api';
import type { ContentItem } from '../types';
import InsightsTabs from './InsightsTabs';
import React from 'react';

const TABS = ['overview','stays','places','food','budget','itinerary'] as const;
type Tab = typeof TABS[number];

const TAB_ICON: Record<string, string> = {
  overview:  '◉',
  stays:     '🏨',
  places:    '📍',
  food:      '🍽',
  budget:    '💰',
  itinerary: '🗓',
};

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
          width: '92%', maxWidth: 560, maxHeight: '87vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 0', background: '#FEFCF8' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <p style={{
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14,
                lineHeight: 1.4, marginBottom: 6, color: 'var(--text-1)',
              }}>
                {item.caption ?? item.url}
              </p>
              <div style={{
                fontSize: 12, color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-ui)',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#F0FDFB', color: '#0F766E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-ui)',
                }}>
                  {(item.creator ?? '?')[0].toUpperCase()}
                </div>
                <span style={{ fontWeight: 500 }}>{item.creator ?? 'Unknown'}</span>
                <span style={{ color: 'var(--text-3)' }}>·</span>
                <span>{item.platform}</span>
                <span style={{ color: 'var(--text-3)' }}>·</span>
                <span>{item.country ?? 'Unknown'}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.05)', border: 'none',
                borderRadius: '50%', width: 30, height: 30,
                cursor: 'pointer', fontSize: 14, color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.12s',
              }}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginTop: 4, borderBottom: '1.5px solid var(--border)' }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding:    '8px 10px',
                  fontSize:   11,
                  border:     'none',
                  cursor:     'pointer',
                  background: 'transparent',
                  color:      tab === t ? '#0D9488' : 'var(--text-3)',
                  fontWeight: tab === t ? 600 : 400,
                  fontFamily: 'var(--font-ui)',
                  borderBottom: tab === t ? '2px solid #0D9488' : '2px solid transparent',
                  marginBottom: '-1.5px',
                  transition: 'all .12s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  textTransform: 'capitalize',
                }}
              >
                <span style={{ fontSize: 10 }}>{TAB_ICON[t]}</span>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
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
