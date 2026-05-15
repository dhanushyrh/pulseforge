// apps/ui/src/pages/SearchPage.tsx
import { useState } from 'react';
import { semanticSearch } from '../api';
import type { SearchResult } from '../types';
import React from 'react';

const SUGGESTED = [
  'Best street food in Southeast Asia',
  'Budget backpacking Europe tips',
  'Hidden beaches worth visiting',
  'Top hotels under $80 per night',
];

export default function SearchPage() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function doSearch(q?: string) {
    const q_ = q ?? query;
    if (!q_.trim()) return;
    if (q) setQuery(q);
    setLoading(true);
    try {
      const res = await semanticSearch({ query: q_, limit: 10 });
      setResults(res.results);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.02em', marginBottom: 4,
        }}>
          Semantic Search
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>
          Search across all creator experiences using AI
        </p>
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16,
        background: '#FFFFFF', borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--border-md)', padding: '6px 6px 6px 14px',
        boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.15s',
      }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = '#0D9488')}
        onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      >
        <span style={{ fontSize: 16, color: 'var(--text-3)', alignSelf: 'center', marginRight: 2 }}>⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="e.g. best street food in Asia, budget tips for Japan…"
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 14, fontFamily: 'var(--font-body)',
            background: 'transparent', color: 'var(--text-1)',
          }}
        />
        <button
          onClick={() => doSearch()}
          disabled={loading}
          style={{
            padding: '8px 18px', background: '#0D9488', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            fontWeight: 600, cursor: 'pointer', fontSize: 13,
            fontFamily: 'var(--font-ui)',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {/* Suggestions */}
      {results.length === 0 && !loading && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Try asking
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SUGGESTED.map(s => (
              <button
                key={s}
                onClick={() => doSearch(s)}
                style={{
                  padding: '6px 13px', background: '#FFFFFF',
                  border: '1.5px solid var(--border)', borderRadius: 20,
                  fontSize: 12, cursor: 'pointer', color: 'var(--text-2)',
                  fontFamily: 'var(--font-ui)', fontWeight: 500,
                  boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#0D9488';
                  e.currentTarget.style.color = '#0F766E';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-2)';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-ui)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            {results.length} results
          </div>
        </div>
      )}

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            marginBottom: 10,
            boxShadow: 'var(--shadow-sm)',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: '#F0FDFB', color: '#0F766E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-ui)',
              }}>
                {(r.creator ?? '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-ui)' }}>
                {r.creator ?? 'Unknown'}
              </span>
              <span style={{
                fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-ui)',
                background: 'var(--bg)', padding: '1px 7px', borderRadius: 10,
              }}>
                {r.platform}
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#0F766E',
              background: '#F0FDFB', padding: '3px 10px', borderRadius: 20,
              fontFamily: 'var(--font-ui)',
            }}>
              {Math.round(r.score * 100)}% match
            </span>
          </div>
          <p style={{
            fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65,
            fontStyle: 'italic', borderLeft: '2px solid #2DD4BF',
            paddingLeft: 12, margin: 0,
          }}>
            "{r.chunk}"
          </p>
        </div>
      ))}

      {results.length === 0 && !loading && query && (
        <div style={{
          color: 'var(--text-3)', fontSize: 13, textAlign: 'center',
          marginTop: 48, fontFamily: 'var(--font-ui)',
        }}>
          No results — try a different query
        </div>
      )}
    </div>
  );
}
