// Tiny fetch wrapper for the admin API. Handles the Bearer token, unwraps
// JSON, throws on non-2xx with the server's error text so callers can just
// try / catch and render a message.

const TOKEN_KEY = 'cig-admin-token'
const TOKEN_TS_KEY = 'cig-admin-token-ts'

// In production the front-end talks to the same origin; in dev, Vite runs
// on :5173 and FastAPI on :8000, so we redirect there.
const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''

export function getToken() {
  try {
    const t = localStorage.getItem(TOKEN_KEY)
    const ts = parseInt(localStorage.getItem(TOKEN_TS_KEY) || '0', 10)
    if (!t) return null
    // Token TTL is 24h; drop if older to force a re-auth on refresh
    if (Date.now() - ts > 24 * 60 * 60 * 1000) return null
    return t
  } catch { return null }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(TOKEN_TS_KEY, String(Date.now()))
  } catch { /* private mode / disabled — token stays in memory only */ }
}

export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_TS_KEY) } catch { /* ignore */ }
}

async function _fetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  if (res.status === 401) { clearToken(); throw new Error('Not authenticated') }
  if (!res.ok) {
    let msg
    try { msg = (await res.json()).detail || res.statusText } catch { msg = res.statusText }
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res
}

export const api = {
  login: (key) =>
    _fetch('/api/auth', { method: 'POST', body: JSON.stringify({ key }) }),
  dataStatus: () => _fetch('/api/data-status'),
  upload: (fileType, file) => {
    const fd = new FormData()
    fd.append('type', fileType)
    fd.append('file', file)
    return _fetch('/api/upload', { method: 'POST', body: fd })
  },
  confirm: (uploadId, action) =>
    _fetch('/api/confirm-upload', {
      method: 'POST',
      body: JSON.stringify({ uploadId, action }),
    }),
  jobStatus: (jobId) => _fetch(`/api/pipeline-status/${jobId}`),
  templateUrl: (fileType) => `${API_BASE}/api/download-template/${fileType}`,
}
