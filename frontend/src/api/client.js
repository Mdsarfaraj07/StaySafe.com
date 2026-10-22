const API_HOST = import.meta.env.VITE_API_HOST;
const BASE = import.meta.env.VITE_API_URL || (API_HOST ? `https://${API_HOST}/api` : '/api');

export const getToken = () => localStorage.getItem('token');
export const setSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && token) {
    // token expired / invalid -> let the app log the user out
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.message) message = data.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Uploaded files are stored as /api/files/...; prefix the API origin when the API lives on another host. */
export function assetUrl(u) {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/api/') && /^https?:\/\//i.test(BASE)) return new URL(BASE).origin + u;
  return u;
}

/** multipart/form-data upload (the browser sets the boundary header itself). */
export async function apiUpload(path, formData, method = 'POST') {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (res.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try { const d = await res.json(); if (d.message) message = d.message; } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json();
}
