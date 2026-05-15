// apps/ui/src/components/Layout.tsx
import { Outlet, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStats } from '../api';
import IngestModal from './IngestModal';
import { useState } from 'react';
import styles from './Layout.module.css';
import React from 'react';

const NAV = [
  { to: '/browse',   icon: '⊞',  label: 'Browse'    },
  { to: '/country',  icon: '🌍', label: 'Countries'  },
  { to: '/creators', icon: '◎',  label: 'Creators'   },
  { to: '/search',   icon: '⌕',  label: 'Search'     },
  { to: '/queue',    icon: '↻',  label: 'Queue'      },
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

        <div className={styles.divider} />

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
