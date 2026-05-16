import React from 'react';
import type { SseEvent } from '../types';

interface Props {
  error:    Extract<SseEvent, { type: 'error' }>;
  onClose:  () => void;
  resetAt?: string;
}

function hoursUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

export function AiLimitModal({ error, onClose, resetAt }: Props) {
  const h = resetAt ? hoursUntil(resetAt) : null;

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏰</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#f1f5f9' }}>
          Daily limit reached
        </h2>
        <p style={{ margin: '0 0 6px', fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
          {error.message}
        </p>
        {resetAt && (
          <p style={{ margin: '0 0 20px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
            Resets at midnight UTC{h !== null ? ` (in ${h}h)` : ''}
          </p>
        )}

        {error.upgrade ? (
          <>
            <a
              href="/settings/billing"
              style={btnPrimary}
            >
              Upgrade to Pro — 100 messages/day
            </a>
            <button onClick={onClose} style={btnSecondary}>
              Wait until midnight
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} style={btnPrimary}>
              Got it
            </button>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
              Tip: shorter messages use fewer tokens
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position:        'absolute',
  inset:           0,
  background:      'rgba(0,0,0,0.75)',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  zIndex:          50,
  backdropFilter:  'blur(4px)',
};

const card: React.CSSProperties = {
  background:   '#0f172a',
  border:       '1px solid #1e293b',
  borderRadius: 16,
  padding:      '32px 28px',
  maxWidth:     360,
  width:        '90%',
  display:      'flex',
  flexDirection:'column',
  alignItems:   'center',
};

const btnPrimary: React.CSSProperties = {
  display:        'block',
  width:          '100%',
  padding:        '12px 0',
  background:     '#6366f1',
  color:          '#fff',
  border:         'none',
  borderRadius:   8,
  fontSize:       14,
  fontWeight:     600,
  cursor:         'pointer',
  textAlign:      'center',
  textDecoration: 'none',
  marginBottom:   8,
};

const btnSecondary: React.CSSProperties = {
  display:      'block',
  width:        '100%',
  padding:      '10px 0',
  background:   'none',
  color:        '#94a3b8',
  border:       '1px solid #1e293b',
  borderRadius: 8,
  fontSize:     13,
  cursor:       'pointer',
};
