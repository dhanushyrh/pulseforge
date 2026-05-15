// apps/ui/src/components/ContentCard.tsx
import React from 'react';
import type { ContentItem } from '../types';
import styles from './ContentCard.module.css';

const TYPE_GRADIENT: Record<string, string> = {
  reel:    'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
  vlog:    'linear-gradient(135deg, #0369A1 0%, #38BDF8 100%)',
  short:   'linear-gradient(135deg, #B45309 0%, #FBBF24 100%)',
  unknown: 'linear-gradient(135deg, #374151 0%, #9CA3AF 100%)',
};

const TYPE_ICON: Record<string, string> = {
  reel:    '📱',
  vlog:    '🎬',
  short:   '▶',
  unknown: '🎞',
};

const STATUS_COLOR: Record<string, string> = {
  completed:  '#22C55E',
  processing: '#F59E0B',
  failed:     '#EF4444',
  queued:     '#60A5FA',
  not_travel: '#9CA3AF',
  pending:    '#9CA3AF',
};

export default function ContentCard({
  item,
  onClick,
}: {
  item:    ContentItem;
  onClick: (item: ContentItem) => void;
}) {
  const conf = Math.round((item.travelConfidence ?? 0) * 100);

  return (
    <div className={styles.card} onClick={() => onClick(item)}>
      <div
        className={styles.thumb}
        style={{ background: TYPE_GRADIENT[item.contentType] ?? TYPE_GRADIENT.unknown }}
      >
        <div className={styles.thumbGlow} />
        <span className={styles.thumbIcon}>
          {TYPE_ICON[item.contentType] ?? '🎞'}
        </span>
        <span className={styles.thumbBadge}>
          {item.countryCode ? countryFlag(item.countryCode) : '🌐'} {item.contentType}
        </span>
        <span
          className={styles.statusDot}
          style={{ background: STATUS_COLOR[item.status] ?? '#ccc' }}
        />
      </div>

      <div className={styles.body}>
        <div className={styles.creator}>
          <div className={styles.avatar}>
            {(item.creator ?? '?')[0].toUpperCase()}
          </div>
          <span className={styles.creatorName}>
            {item.creator ?? 'Unknown'}
          </span>
          <span className={styles.platform}>{item.platform}</span>
        </div>

        <p className={styles.caption}>
          {item.caption ?? item.url}
        </p>

        <div className={styles.footer}>
          <div className={styles.tags}>
            <Tag type={item.contentType} />
            {item.isTravel && <Tag type="travel" />}
          </div>
        </div>

        <div className={styles.confRow}>
          <div className={styles.confTrack}>
            <div className={styles.confFill} style={{ width: `${conf}%` }} />
          </div>
          <span className={styles.confLabel}>{conf}%</span>
        </div>
      </div>
    </div>
  );
}

function Tag({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    reel:    { bg: '#F3F0FF', color: '#6D28D9' },
    vlog:    { bg: '#EFF6FF', color: '#1D4ED8' },
    short:   { bg: '#FFFBEB', color: '#B45309' },
    travel:  { bg: '#F0FDFB', color: '#0F766E' },
    unknown: { bg: '#F9FAFB', color: '#4B5563' },
  };
  const s = map[type] ?? map.unknown;
  return (
    <span style={{
      background:   s.bg,
      color:        s.color,
      fontSize:     10,
      padding:      '2px 8px',
      borderRadius: 20,
      fontWeight:   600,
      fontFamily:   'var(--font-ui)',
      letterSpacing: '0.01em',
    }}>
      {type === 'travel' ? '✓ travel' : type}
    </span>
  );
}

function countryFlag(code: string) {
  return code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');
}
