import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import axios from 'axios';

interface GeneratedCode {
  code: string;
  plan: string;
  expiresAt: string | null;
  createdAt: string;
}

export default function InvitePage() {
  const { user, accessToken } = useAuth();
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [expiresAt, setExpiresAt] = useState('');
  const [codes, setCodes] = useState<GeneratedCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (user?.plan !== 'admin') return <Navigate to="/browse" replace />;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authApi.generateInvite(accessToken!, plan, expiresAt || undefined);
      setCodes(prev => [result, ...prev]);
    } catch (err) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.message ?? 'Failed to generate');
      else setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Invite Codes</h1>

      <form onSubmit={handleGenerate} style={styles.form}>
        <label style={styles.label}>
          Plan
          <select value={plan} onChange={e => setPlan(e.target.value as 'free' | 'pro')} style={styles.select}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </label>

        <label style={styles.label}>
          Expires at <span style={styles.optional}>(optional)</span>
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            style={styles.input}
          />
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} style={styles.btn}>
          {loading ? 'Generating…' : 'Generate invite code'}
        </button>
      </form>

      {codes.length > 0 && (
        <div style={styles.list}>
          <h2 style={styles.subheading}>Generated this session</h2>
          {codes.map(c => (
            <div key={c.code} style={styles.codeRow}>
              <div>
                <span style={styles.code}>{c.code}</span>
                <span style={styles.planBadge}>{c.plan.toUpperCase()}</span>
                {c.expiresAt && (
                  <span style={styles.expiry}>expires {new Date(c.expiresAt).toLocaleDateString()}</span>
                )}
              </div>
              <button onClick={() => copy(c.code)} style={styles.copyBtn}>
                {copied === c.code ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '32px 24px', maxWidth: 560, color: '#e2e8f0' },
  heading: { fontSize: 20, fontWeight: 700, margin: '0 0 24px' },
  subheading: { fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: '0 0 12px' },
  form: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#94a3b8', fontWeight: 500 },
  optional: { color: '#475569', fontWeight: 400 },
  select: { background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14 },
  input: { background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14 },
  error: { color: '#f87171', fontSize: 13, margin: 0 },
  btn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  codeRow: { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#a5b4fc', marginRight: 10 },
  planBadge: { fontSize: 10, fontWeight: 700, background: '#1e293b', color: '#94a3b8', borderRadius: 4, padding: '2px 6px', marginRight: 8 },
  expiry: { fontSize: 12, color: '#64748b' },
  copyBtn: { background: '#1e293b', color: '#94a3b8', border: '1px solid #2a2d3a', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
};
