'use client';

import { useEffect, useState } from 'react';
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
    // 1) state
    if (threadId) return threadId;

    // 2) localStorage
    const saved = getSavedThreadId(documentId);
    if (saved) {
      setThreadId(saved);
      return saved;
    }

    // 3) create
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

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Document</h1>
        <div className="flex gap-3">
          <button className="underline" onClick={() => router.push('/documents')}>
            Back
          </button>
          <button className="underline" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {err && (
        <div className="border border-red-300 bg-red-50 text-red-700 p-3">
          {err}
        </div>
      )}

      <section className="border p-4 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="font-semibold truncate">
            {doc?.originalName ?? 'Loading...'}
          </div>

          <button className="bg-black text-white px-4 py-2" onClick={downloadExport}>
            Download export PDF
          </button>
        </div>
      </section>

      <section className="border p-4 space-y-3">
        <h2 className="font-semibold">Chat</h2>

        <div className="border p-3 h-64 overflow-auto bg-white">
          {messages.length === 0 ? (
            <p className="text-sm opacity-70">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id}>
                  <div className="text-xs opacity-60">
                    {m.role} • {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="border p-2 flex-1"
            placeholder="Ask a question about the invoice..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
            disabled={loading}
          />
          <button
            className="bg-black text-white px-4 py-2"
            onClick={sendMessage}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </section>
    </main>
  );
}
