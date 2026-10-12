export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiFetch(input, options = {}) {
  const requestUrl = typeof input === 'string' && input.startsWith('/api/')
    ? `${API_BASE}${input.slice(4)}`
    : input;
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('token');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(requestUrl, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}
