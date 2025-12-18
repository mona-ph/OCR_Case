'use client';

import { useEffect, useState } from 'react';
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

  async function load() {
    setErr(null);
    try {
      const data = await apiFetch('/documents');
      setDocs(data);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function upload() {
    if (!file) return;
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await apiFetch('/documents/upload', { method: 'POST', body: fd });
      setFile(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <button className="underline" onClick={logout}>Logout</button>
      </div>

      <section className="border p-4 space-y-3">
        <h2 className="font-semibold">Upload invoice</h2>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="bg-black text-white px-4 py-2" onClick={upload} disabled={!file}>
          Upload
        </button>
        {err && <p className="text-red-600">{err}</p>}
      </section>

      <section className="border p-4">
        <h2 className="font-semibold mb-3">Your documents</h2>
        <ul className="space-y-2">
          {docs.map(d => (
            <li key={d.id} className="flex justify-between">
              <Link className="underline" href={`/documents/${d.id}`}>{d.originalName}</Link>
              <span className="text-sm opacity-70">{new Date(d.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
