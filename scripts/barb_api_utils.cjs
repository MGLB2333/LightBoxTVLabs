// Simple BARB API helper for Node scripts (no Vite proxy)
// Usage: set BARB_EMAIL and BARB_PASSWORD in your environment

const BASE_URL = 'https://barb-api.co.uk/api/v1';

async function authenticate(email, password) {
  if (!email || !password) {
    throw new Error('Missing BARB_EMAIL or BARB_PASSWORD');
  }
  const res = await fetch(`${BASE_URL}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Auth failed: ${res.status} ${res.statusText} – ${txt}`);
  }
  const data = await res.json();
  return data.access;
}

function buildUrl(endpoint, params = {}) {
  const url = new URL(endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function getAll(accessToken, endpoint, params = {}) {
  let next = buildUrl(endpoint, params);
  const results = [];
  while (next) {
    const res = await fetch(next, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GET ${next} failed: ${res.status} ${res.statusText} – ${txt}`);
    }
    const data = await res.json();
    if (Array.isArray(data.results)) results.push(...data.results);
    else if (Array.isArray(data.events)) results.push(...data.events);
    else if (Array.isArray(data)) results.push(...data);
    next = data.next || null;
  }
  return results;
}

module.exports = {
  BASE_URL,
  authenticate,
  buildUrl,
  getAll,
};


