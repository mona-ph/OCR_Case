'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, fileUrl } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';

type Doc = {
  id: string;
  originalName: string;
  createdAt: string;
};

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type Thread = {
  id: string;
  messages: Msg[];
};

function threadKey(documentId: string) {
  return `threadId:${documentId}`;
}

function getSavedThreadId(documentId: string) {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(threadKey(documentId));
}

function saveThreadId(documentId: string, tid: string) {
  localStorage.setItem(threadKey(documentId), tid);
}

function clearSavedThreadId(documentId: string) {
  localStorage.removeItem(threadKey(documentId));
}

function initials(name: string) {
  const clean = (name || '').trim();
  if (!clean) return 'D';
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || 'D';
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = params.id;

  const [doc, setDoc] = useState<Doc | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const docLabel = useMemo(() => {
    if (!doc) return 'Loading...';
    return doc.originalName;
  }, [doc]);

  async function loadDoc() {
    const data = await apiFetch(`/documents/${documentId}`);
    setDoc({
      id: data.id,
      originalName: data.originalName,
      createdAt: data.createdAt,
    });
  }

  async function loadThread(tid: string) {
    const t: Thread = await apiFetch(`/chats/${tid}`);
    setMessages(t.messages ?? []);
  }

  async function ensureThread() {
    if (threadId) return threadId;

    const saved = getSavedThreadId(documentId);
    if (saved) {
      setThreadId(saved);
      return saved;
    }

    const t = await apiFetch(`/chats/${documentId}/threads`, { method: 'POST' });
    setThreadId(t.id);
    saveThreadId(documentId, t.id);
    return t.id as string;
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content) return;

    setErr(null);
    setLoading(true);

    try {
      const tid = await ensureThread();

      const res = await apiFetch(`/chats/${tid}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      const userMsg = res.userMsg as Msg;
      const assistantMsg = res.assistantMsg as Msg;

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    const ok = confirm('Clear chat history for this document? This cannot be undone.');
    if (!ok) return;

    setErr(null);
    setLoading(true);

    try {
      await apiFetch(`/documents/${documentId}/chat`, { method: 'DELETE' });
      setMessages([]);
      setThreadId(null);
      clearSavedThreadId(documentId);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    router.push('/login');
  }

  async function downloadExport() {
    setErr(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(fileUrl(`/documents/${documentId}/export`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Export failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'document-export.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  // Load doc + existing thread messages on page load
  useEffect(() => {
    loadDoc().catch((e) => setErr(e.message));

    const saved = getSavedThreadId(documentId);
    if (saved) {
      setThreadId(saved);
      loadThread(saved).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Auto-scroll chat
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

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
      <div style={{ width: '100%', maxWidth: 980, margin: '0 auto' }}>
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
                fontSize: 24,
                lineHeight: 1.1,
                letterSpacing: -0.5,
                color: '#0f172a',
              }}
              title={docLabel}
            >
              {docLabel}
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
              Ask questions based on the OCR-extracted text. Exported PDF includes invoice + OCR + chat history.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => router.push('/documents')}
              type="button"
              style={{
                fontSize: 13,
                color: 'rgba(15, 23, 42, 0.70)',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid rgba(15, 23, 42, 0.10)',
                background: 'rgba(15, 23, 42, 0.03)',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
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

            <button
              onClick={downloadExport}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff',
                fontWeight: 700,
                boxShadow: '0 10px 20px rgba(37, 99, 235, 0.22)',
              }}
            >
              Export PDF
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

        {/* Main card */}
        <section
          style={{
            borderRadius: 16,
            border: '1px solid rgba(15, 23, 42, 0.10)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 10px 30px rgba(15,23,42,0.08), 0 2px 10px rgba(15,23,42,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Chat header bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: 14,
              borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
              background: 'rgba(15, 23, 42, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(37,99,235,.18), rgba(124,58,237,.18))',
                  border: '1px solid rgba(15, 23, 42, 0.10)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'rgba(15, 23, 42, 0.75)',
                }}
                title={doc?.originalName ?? 'Document'}
              >
                {initials(doc?.originalName ?? 'Document')}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Chat</div>
                <div style={{ fontSize: 12, color: 'rgba(15, 23, 42, 0.60)' }}>
                  {messages.length === 0 ? 'Start by asking a question.' : `${messages.length} messages`}
                </div>
              </div>
            </div>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                disabled={loading}
                type="button"
                style={{
                  fontSize: 13,
                  color: '#b91c1c',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(185, 28, 28, 0.25)',
                  background: 'rgba(185, 28, 28, 0.06)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
                title="Delete all chat messages for this document"
              >
                Clear chat
              </button>
            )}
          </div>

          {/* Messages */}
          <div
            ref={scrollerRef}
            style={{
              height: 420,
              overflow: 'auto',
              padding: 14,
              background:
                'radial-gradient(900px circle at 10% 0%, rgba(37,99,235,.06), transparent 60%),' +
                'radial-gradient(700px circle at 90% 0%, rgba(124,58,237,.05), transparent 60%),' +
                'linear-gradient(180deg, rgba(248,250,252,0.55) 0%, rgba(255,255,255,0.95) 55%)',
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  borderRadius: 14,
                  border: '1px dashed rgba(15, 23, 42, 0.18)',
                  background: 'rgba(15, 23, 42, 0.03)',
                  padding: 14,
                  color: 'rgba(15, 23, 42, 0.70)',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>No messages yet</div>
                <div style={{ color: 'rgba(15, 23, 42, 0.60)' }}>
                  Try asking: <span style={{ fontWeight: 700 }}>&quot;What is the total price?&quot;</span> or{' '}
                  <span style={{ fontWeight: 700 }}>&quot;Who do I have to pay?&quot;</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: 740,
                          borderRadius: 16,
                          padding: '10px 12px',
                          border: '1px solid rgba(15, 23, 42, 0.10)',
                          background: isUser
                            ? 'linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(124,58,237,0.14) 100%)'
                            : 'rgba(255,255,255,0.92)',
                          boxShadow: '0 6px 18px rgba(15,23,42,0.06)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginBottom: 6,
                            fontSize: 11,
                            color: 'rgba(15, 23, 42, 0.60)',
                          }}
                        >
                          <span style={{ fontWeight: 800, color: 'rgba(15, 23, 42, 0.70)' }}>
                            {isUser ? 'You' : 'Assistant'}
                          </span>
                          <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                        </div>

                        <div
                          style={{
                            whiteSpace: 'pre-wrap',
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: 'rgba(15, 23, 42, 0.92)',
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        borderRadius: 16,
                        padding: '10px 12px',
                        border: '1px solid rgba(15, 23, 42, 0.10)',
                        background: 'rgba(15, 23, 42, 0.03)',
                        color: 'rgba(15, 23, 42, 0.70)',
                        fontSize: 13,
                      }}
                    >
                      Assistant is thinking…
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input bar */}
          <div
            style={{
              padding: 14,
              borderTop: '1px solid rgba(15, 23, 42, 0.08)',
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the invoice..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  padding: '12px 12px',
                  border: '1px solid rgba(15, 23, 42, 0.14)',
                  outline: 'none',
                  background: 'rgba(255,255,255,0.95)',
                }}
              />

              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: 'none',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  boxShadow: '0 10px 20px rgba(37, 99, 235, 0.22)',
                  opacity: loading || !input.trim() ? 0.7 : 1,
                  minWidth: 110,
                }}
              >
                {loading ? 'Sending...' : 'Send'}
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
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 16,
                color: 'rgba(255, 3, 3, 0.55)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span>Tip: keep questions simple and specific to the image (total price, date, etc).</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
