import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, name || undefined, inviteCode);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg: string = err.response?.data?.message ?? '';
        if (status === 400 && msg.includes('Invalid invite')) setError('This invite code is invalid');
        else if (status === 400 && msg.includes('already used')) setError('This invite code has already been used');
        else if (status === 400 && msg.includes('expired')) setError('This invite code has expired');
        else if (status === 409) setError('An account with this email already exists');
        else setError('Something went wrong');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.bolt}>⚡</span>
          PulseForge
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Name <span style={styles.optional}>(optional)</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password <span style={styles.optional}>(min 8 chars)</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Invite code
            <input
              type="text"
              required
              placeholder="PF-XXXXXXXX"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              style={styles.input}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.foot}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f1117',
  },
  card: {
    background: '#1a1d27',
    border: '1px solid #2a2d3a',
    borderRadius: 12,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  logo: {
    fontSize: 22,
    fontWeight: 700,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  bolt: { color: '#f59e0b', fontSize: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: 500,
  },
  optional: { color: '#475569', fontWeight: 400 },
  input: {
    background: '#0f1117',
    border: '1px solid #2a2d3a',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
  },
  error: { color: '#f87171', fontSize: 13, margin: 0 },
  btn: {
    marginTop: 4,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  foot: { textAlign: 'center', fontSize: 13, color: '#64748b', margin: 0 },
  link: { color: '#818cf8', textDecoration: 'none' },
};
