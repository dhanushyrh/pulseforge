// apps/ui/src/pages/SearchPage.tsx
import { useState } from 'react';
import { semanticSearch } from '../api';
import type { SearchResult } from '../types';
import React from 'react';

export default function SearchPage() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await semanticSearch({ query, limit: 10 });
      setResults(res.results);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize:18, fontWeight:500, marginBottom:20 }}>Semantic search</h1>

      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key==='Enter' && doSearch()}
          placeholder="e.g. best street food in Asia..."
          style={{ flex:1, padding:'9px 14px', border:'0.5px solid var(--border-md)', borderRadius:'var(--radius-md)', fontSize:14, outline:'none' }}
        />
        <button
          onClick={doSearch}
          disabled={loading}
          style={{ padding:'9px 20px', background:'var(--purple-600)', color:'#fff', border:'none', borderRadius:'var(--radius-md)', fontWeight:500, cursor:'pointer', fontSize:13 }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.map((r, i) => (
        <div
          key={i}
          style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 16px', marginBottom:10 }}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--text-2)' }}>{r.creator ?? 'Unknown'}</span>
              <span style={{ fontSize:11, color:'var(--text-3)' }}>{r.platform}</span>
            </div>
            <span style={{ fontSize:12, fontWeight:500, color:'var(--green-700)', background:'var(--green-50)', padding:'2px 8px', borderRadius:20 }}>
              {Math.round(r.score * 100)}% match
            </span>
          </div>
          <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6, fontStyle:'italic' }}>
            "{r.chunk}"
          </p>
        </div>
      ))}

      {results.length === 0 && !loading && query && (
        <div style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', marginTop:40 }}>
          No results — try a different query
        </div>
      )}
    </div>
  );
}