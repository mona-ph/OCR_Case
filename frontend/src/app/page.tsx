'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.replace('/documents');
  }, [router]);

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
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.1,
              letterSpacing: -0.6,
              color: '#0f172a',
            }}
          >
            OCR Case
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 18,
              fontSize: 15,
              lineHeight: 1.5,
              color: 'rgba(15, 23, 42, 0.75)',
              maxWidth: 560,
            }}
          >
            Upload invoices (PNG/JPG), extract text with OCR, ask questions, and export a PDF with the
            original document + OCR + Q&A.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                boxShadow: '0 10px 20px rgba(37, 99, 235, 0.22)',
              }}
            >
              Go to Login
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
                  fontSize: 18,
                }}
              >
                →
              </span>
            </Link>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(15, 23, 42, 0.10)',
                background: 'rgba(15, 23, 42, 0.03)',
                color: 'rgba(15, 23, 42, 0.70)',
                fontSize: 16,
              }}
              title="If you're already logged in, you'll be redirected automatically."
            >
              Already authenticated? You’ll be redirected.
            </div>
          </div>

          {/* Footer hint */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid rgba(15, 23, 42, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              color: 'rgba(15, 23, 42, 0.55)',
              fontSize: 12,
            }}
          >
            <span>JWT stored in localStorage (case prototype)</span>
            <span>Next.js + NestJS + Prisma + Postgres</span>
          </div>
        </div>
      </div>
    </main>
  );
}
