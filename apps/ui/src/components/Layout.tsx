// apps/ui/src/components/Layout.tsx
import { Outlet, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStats, getUsage } from '../api';
import { useAuth } from '../context/AuthContext';
import IngestModal from './IngestModal';
import { AiUsageBar } from './AiUsageBar';
import { useState } from 'react';
import styles from './Layout.module.css';
import React from 'react';

const BASE_NAV = [
  { to: '/browse',   icon: '⊞',  label: 'Browse'    },
  { to: '/country',  icon: '🌍', label: 'Countries'  },
  { to: '/creators', icon: '◎',  label: 'Creators'   },
  { to: '/trips',    icon: '🗺',  label: 'My trips'   },
  { to: '/search',   icon: '⌕',  label: 'Search'     },
  { to: '/queue',    icon: '↻',  label: 'Queue'      },
];

function UsagePill() {
  const { data } = useQuery({
    queryKey: ['usage'],
    queryFn: getUsage,
    refetchInterval: 60_000,
  });

  if (!data) return null;

  const isAdmin = data.plan === 'admin';
  const pct = isAdmin ? 0 : Math.min(100, (data.today / data.limit) * 100);
  const danger = !isAdmin && data.remaining === 0;
  const warn   = !isAdmin && !danger && data.remaining <= 1;

  return (
    <div style={usageStyles.wrap}>
      <div style={usageStyles.row}>
        <span style={{ ...usageStyles.badge, background: isAdmin ? '#0f4c2a' : '#1e293b', color: isAdmin ? '#4ade80' : '#94a3b8' }}>
          {data.plan.toUpperCase()}
        </span>
        <span style={{ ...usageStyles.count, color: danger ? '#f87171' : warn ? '#fbbf24' : '#94a3b8' }}>
          {isAdmin ? 'Unlimited' : `${data.today}/${data.limit} today`}
        </span>
      </div>
      {!isAdmin && (
        <div style={usageStyles.bar}>
          <div style={{ ...usageStyles.fill, width: `${pct}%`, background: danger ? '#f87171' : warn ? '#fbbf24' : '#6366f1' }} />
        </div>
      )}
    </div>
  );
}

const usageStyles: Record<string, React.CSSProperties> = {
  wrap:  { padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 6 },
  row:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  badge: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' },
  count: { fontSize: 12 },
  bar:   { height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 2, transition: 'width 0.3s' },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [showIngest, setShowIngest] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn:  getStats,
    refetchInterval: 15_000,
  });

  const nav = user?.plan === 'admin'
    ? [...BASE_NAV, { to: '/admin/invite', icon: '🔑', label: 'Invites' }]
    : BASE_NAV;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoBolt}>⚡</span>
          PulseForge
        </div>

        <div className={styles.statsBlock}>
          <div className={styles.statPill}>
            <span className={styles.statLabel}>Videos</span>
            <span className={styles.statValue}>{stats?.total ?? '—'}</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statLabel}>Travel</span>
            <span className={`${styles.statValue} ${styles.green}`}>{stats?.travel ?? '—'}</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statLabel}>Processing</span>
            <span className={`${styles.statValue} ${styles.amber}`}>{stats?.processing ?? '—'}</span>
          </div>
        </div>

        <UsagePill />
        <AiUsageBar compact />

        <div className={styles.divider} />

        <nav className={styles.nav}>
          {nav.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
            >
              <span className={styles.navIcon}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button
          className={styles.ingestBtn}
          onClick={() => setShowIngest(true)}
        >
          + Ingest URL
        </button>

        <button
          onClick={logout}
          style={{ marginTop: 8, background: 'none', border: '1px solid #2a2d3a', borderRadius: 8, color: '#64748b', fontSize: 12, padding: '8px 0', cursor: 'pointer', width: '100%' }}
        >
          Sign out {user?.email ? `(${user.email})` : ''}
        </button>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      {showIngest && <IngestModal onClose={() => setShowIngest(false)} />}
    </div>
  );
}
