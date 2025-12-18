'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', res.access_token);
      router.push('/documents');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(1200px circle at 20% 10%, rgba(59,130,246,.18), transparent 55%),' +
          'radial-gradient(1000px circle at 80% 20%, rgba(168,85,247,.16), transparent 55%),' +
          'linear-gradient(180deg, #f8fafc 0%, #ffffff 60%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 720 }}>
        {/* Card */}
        <div
          style={{
            borderRadius: 16,
            border: '1px solid rgba(15, 23, 42, 0.10)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow:
              '0 10px 30px rgba(15,23,42,0.08), 0 2px 10px rgba(15,23,42,0.04)',
            padding: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.1,
                  letterSpacing: -0.5,
                  color: '#0f172a',
                }}
              >
                Login
              </h1>
              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: 'rgba(15, 23, 42, 0.75)',
                }}
              >
                Sign in to access your documents and chats.
              </p>
            </div>

            <Link
              href="/"
              style={{
                fontSize: 13,
                color: 'rgba(15, 23, 42, 0.70)',
                textDecoration: 'none',
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid rgba(15, 23, 42, 0.10)',
                background: 'rgba(15, 23, 42, 0.03)',
              }}
              title="Back to home"
            >
              ← Home
            </Link>
          </div>

          {err && (
            <div
              style={{
                marginTop: 16,
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.10)',
                color: 'rgba(127, 29, 29, 0.95)',
                padding: 12,
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: 'rgba(15, 23, 42, 0.70)',
                    fontWeight: 600,
                  }}
                >
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  className="border p-2 w-full"
                  style={{
                    borderRadius: 12,
                    padding: '12px 12px',
                    border: '1px solid rgba(15, 23, 42, 0.14)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: 'rgba(15, 23, 42, 0.70)',
                    fontWeight: 600,
                  }}
                >
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  className="border p-2 w-full"
                  style={{
                    borderRadius: 12,
                    padding: '12px 12px',
                    border: '1px solid rgba(15, 23, 42, 0.14)',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                disabled={loading || !email || !password}
                type="submit"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background:
                    'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: '0 10px 20px rgba(37, 99, 235, 0.22)',
                  opacity: loading || !email || !password ? 0.7 : 1,
                }}
              >
                {loading ? 'Signing in...' : 'Login'}
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.18)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}
                >
                  →
                </span>
              </button>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 12, color: 'rgba(15, 23, 42, 0.60)' }}>
                  JWT stored in localStorage (case prototype)
                </span>

                <span style={{ fontSize: 12, color: 'rgba(15, 23, 42, 0.75)' }}>
                  No account?{' '}
                  <Link
                    className="underline"
                    href="/register"
                    style={{ color: '#2563eb', fontWeight: 600 }}
                  >
                    Register
                  </Link>
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
