// apps/ui/src/components/ContentCard.tsx
import React from 'react';
import type { ContentItem } from '../types';
import styles from './ContentCard.module.css';

const TYPE_COLORS: Record<string, string> = {
  reel:    'var(--purple-50)',
  vlog:    'var(--teal-50)',
  short:   'var(--amber-50)',
  unknown: '#f1f0f0',
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
        style={{ background: TYPE_COLORS[item.contentType] ?? '#f1f0f0' }}
      >
        <span className={styles.thumbIcon}>
          {item.contentType === 'reel'  ? '📱' :
           item.contentType === 'vlog'  ? '🎬' :
           item.contentType === 'short' ? '▶'  : '🎞'}
        </span>
        <span className={styles.thumbBadge}>
          {item.countryCode ? countryFlag(item.countryCode) : '🌐'} {item.contentType}
        </span>
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
            <div
              className={styles.confFill}
              style={{ width: `${conf}%` }}
            />
          </div>
          <span className={styles.confLabel}>{conf}%</span>
        </div>
      </div>
    </div>
  );
}

function Tag({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    reel:    { bg: 'var(--purple-50)', color: 'var(--purple-800)' },
    vlog:    { bg: 'var(--teal-50)',   color: 'var(--teal-700)' },
    short:   { bg: 'var(--amber-50)',  color: 'var(--amber-700)' },
    travel:  { bg: 'var(--green-50)',  color: 'var(--green-700)' },
    unknown: { bg: '#f1f0f0',          color: 'var(--text-2)' },
  };
  const s = map[type] ?? map.unknown;
  return (
    <span style={{
      background:   s.bg,
      color:        s.color,
      fontSize:     10,
      padding:      '2px 8px',
      borderRadius: 20,
      fontWeight:   500,
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