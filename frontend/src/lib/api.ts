const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(init.headers as any),
  };

  // If sending JSON, ensure content-type is set.
  if (init.body && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  // Try JSON first; fallback to text for debugging
  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `Request failed (${res.status})`);
  }

  try {
    return JSON.parse(text);
  } catch {
    // If backend returns non-json (shouldn’t), return raw
    return text as any;
  }
}

export function fileUrl(path: string) {
  return `${API_BASE}${path}`;
}
