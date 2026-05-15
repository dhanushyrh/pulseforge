// apps/ui/src/components/Layout.tsx
import { Outlet, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStats } from '../api';
import IngestModal from './IngestModal';
import { useState } from 'react';
import styles from './Layout.module.css';
import React from 'react';

const NAV = [
  { to: '/browse',   icon: '⊞', label: 'Browse'   },
  { to: '/country',  icon: '🌍', label: 'Countries' },
  { to: '/type',     icon: '▶',  label: 'By type'   },
  { to: '/creators', icon: '👤', label: 'Creators'  },  // ← new
  { to: '/search',   icon: '⌕',  label: 'Search'    },
  { to: '/queue',    icon: '⟳',  label: 'Queue'     },
];

export default function Layout() {
  const [showIngest, setShowIngest] = useState(false);
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn:  getStats,
    refetchInterval: 15_000,
  });

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoBolt}>⚡</span>
          <span>PulseForge</span>
        </div>

        <div className={styles.statsBlock}>
          <StatPill label="Total"      value={stats?.total      ?? '—'} />
          <StatPill label="Travel"     value={stats?.travel     ?? '—'} color="green" />
          <StatPill label="Processing" value={stats?.processing ?? '—'} color="amber" />
        </div>

        <nav className={styles.nav}>
          {NAV.map(n => (
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
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      {showIngest && <IngestModal onClose={() => setShowIngest(false)} />}
    </div>
  );
}

function StatPill({ label, value, color = 'default' }: {
  label: string; value: number | string; color?: string;
}) {
  const colors: Record<string, string> = {
    default: '#f1efe8',
    green:   '#eaf3de',
    amber:   '#faeeda',
  };
  return (
    <div style={{
      background:   colors[color],
      borderRadius: 'var(--radius-md)',
      padding:      '8px 10px',
      marginBottom: 6,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500 }}>{value}</div>
    </div>
  );
}