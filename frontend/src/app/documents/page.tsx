'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

type Doc = {
  id: string;
  originalName: string;
  createdAt: string;
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const selectedFileLabel = useMemo(() => {
    if (!file) return 'Choose an image (PNG/JPG)';
    return `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  async function clearHistory() {
    const ok = confirm(
      'Are you sure you want to delete all your documents? This cannot be undone.',
    );
    if (!ok) return;

    setErr(null);
    setClearing(true);

    try {
      await apiFetch('/documents', { method: 'DELETE' });
      setDocs([]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setClearing(false);
    }
  }

  async function load() {
    setErr(null);
    try {
      const data = await apiFetch('/documents');
      setDocs(data);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file) return;

    setErr(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      await apiFetch('/documents/upload', { method: 'POST', body: fd });
      setFile(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background:
          'radial-gradient(1200px circle at 20% 10%, rgba(59,130,246,.18), transparent 55%),' +
          'radial-gradient(1000px circle at 80% 20%, rgba(168,85,247,.16), transparent 55%),' +
          'linear-gradient(180deg, #f8fafc 0%, #ffffff 60%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 920, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
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
              Documents
            </h1>
            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 14,
                lineHeight: 1.5,
                color: 'rgba(15, 23, 42, 0.75)',
              }}
            >
              Upload an invoice image, then chat using OCR-extracted text and export a PDF report.
            </p>
          </div>

          <button
            onClick={logout}
            type="button"
            style={{
              fontSize: 13,
              color: 'rgba(255, 255, 255, 1)',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(0, 0, 0, 1)',
              background: 'rgba(60, 60, 61, 1)',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>

        {/* Error banner */}
        {err && (
          <div
            style={{
              marginBottom: 16,
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.10)',
              color: 'rgba(127, 29, 29, 0.95)',
              padding: 12,
              borderRadius: 14,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        {/* Content grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 16,
          }}
        >
          {/* Upload card */}
          <section
            style={{
              borderRadius: 16,
              border: '1px solid rgba(15, 23, 42, 0.10)',
              background: 'rgba(255,255,255,0.92)',
              boxShadow:
                '0 10px 30px rgba(15,23,42,0.08), 0 2px 10px rgba(15,23,42,0.04)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Upload invoice image
                </h2>
              </div>

              <button
                onClick={upload}
                disabled={!file || uploading || clearing}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: !file || uploading || clearing ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: '0 10px 20px rgba(37, 99, 235, 0.22)',
                  opacity: !file || uploading || clearing ? 0.7 : 1,
                  minWidth: 120,
                }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
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
                  ↑
                </span>
              </button>
            </div>

            {/* File picker */}
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <label
                style={{
                  display: 'block',
                  borderRadius: 14,
                  border: '1px dashed rgba(15, 23, 42, 0.22)',
                  background: 'rgba(15, 23, 42, 0.03)',
                  padding: 14,
                  cursor: uploading || clearing ? 'not-allowed' : 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(15, 23, 42, 0.80)',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {selectedFileLabel}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(15, 23, 42, 0.60)' }}>
                  Click to select a file.
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={uploading || clearing}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </section>

          {/* Documents list card */}
          <section
            style={{
              borderRadius: 16,
              border: '1px solid rgba(15, 23, 42, 0.10)',
              background: 'rgba(255,255,255,0.92)',
              boxShadow:
                '0 10px 30px rgba(15,23,42,0.08), 0 2px 10px rgba(15,23,42,0.04)',
              padding: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Your documents
                </h2>
                <p
                  style={{
                    marginTop: 6,
                    marginBottom: 0,
                    fontSize: 13,
                    color: 'rgba(15, 23, 42, 0.70)',
                  }}
                >
                  {docs.length} item{docs.length === 1 ? '' : 's'}
                </p>
              </div>

              {docs.length > 0 && (
                <button
                  onClick={clearHistory}
                  disabled={clearing || uploading}
                  type="button"
                  style={{
                    fontSize: 13,
                    color: '#b91c1c',
                    textDecoration: 'none',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(185, 28, 28, 0.25)',
                    background: 'rgba(185, 28, 28, 0.06)',
                    cursor: clearing || uploading ? 'not-allowed' : 'pointer',
                    opacity: clearing || uploading ? 0.7 : 1,
                  }}
                  title="Delete all documents for this account"
                >
                  {clearing ? 'Clearing...' : 'Clear history'}
                </button>
              )}
            </div>

            {docs.length === 0 ? (
              <div
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(15, 23, 42, 0.10)',
                  background: 'rgba(15, 23, 42, 0.02)',
                  padding: 14,
                  fontSize: 13,
                  color: 'rgba(15, 23, 42, 0.70)',
                }}
              >
                No invoice image uploaded yet.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {docs.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderRadius: 14,
                      border: '1px solid rgba(15, 23, 42, 0.10)',
                      background: 'rgba(255,255,255,0.9)',
                      padding: '12px 12px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Link
                        href={`/documents/${d.id}`}
                        style={{
                          display: 'inline-block',
                          textDecoration: 'none',
                          color: '#0f172a',
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                        title={d.originalName}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            maxWidth: 520,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'bottom',
                          }}
                        >
                          {d.originalName}
                        </span>
                      </Link>

                      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(15, 23, 42, 0.60)' }}>
                        Uploaded • {new Date(d.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <Link
                      href={`/documents/${d.id}`}
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid rgba(15, 23, 42, 0.10)',
                        background: 'rgba(15, 23, 42, 0.03)',
                        color: 'rgba(15, 23, 42, 0.75)',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                      title="Open document"
                    >
                      Open
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-flex',
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: 'rgba(15,23,42,0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                        }}
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid rgba(15, 23, 42, 0.08)',
                fontSize: 12,
                color: 'rgba(15, 23, 42, 0.55)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
