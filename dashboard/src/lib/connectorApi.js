import { getToken } from './api'

const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''

async function _fetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  if (res.status === 401) throw new Error('Not authenticated')
  if (!res.ok) {
    let msg
    try { msg = (await res.json()).detail || res.statusText } catch { msg = res.statusText }
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res
}

export const connectorApi = {
  listConnectors: () =>
    _fetch('/api/connectors'),

  createConnector: (type, config, name, credentials, schedule) =>
    _fetch('/api/connectors', {
      method: 'POST',
      body: JSON.stringify({ type, name, config, credentials: credentials || {}, schedule: schedule || { mode: 'manual' } }),
    }),

  getConnector: (id) =>
    _fetch(`/api/connectors/${id}`),

  updateConnector: (id, updates) =>
    _fetch(`/api/connectors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteConnector: (id) =>
    _fetch(`/api/connectors/${id}`, { method: 'DELETE' }),

  testConnection: (id) =>
    _fetch(`/api/connectors/${id}/test`, { method: 'POST' }),

  previewData: (id, limit = 10) =>
    _fetch(`/api/connectors/${id}/preview?limit=${limit}`),

  syncNow: (id) =>
    _fetch(`/api/connectors/${id}/sync`, { method: 'POST' }),

  getSyncStatus: (id) =>
    _fetch(`/api/connectors/${id}/sync/status`),

  setSchedule: (id, schedule) =>
    _fetch(`/api/connectors/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    }),

  validateData: (id) =>
    _fetch(`/api/connectors/${id}/validate`),

  clearSample: (backup = true) =>
    _fetch('/api/connectors/clear-sample', {
      method: 'POST',
      body: JSON.stringify({ backup }),
    }),

  getConnectorTypes: () =>
    _fetch('/api/connectors/types'),

  getConnectorConfig: (id) =>
    _fetch(`/api/connectors/${id}/config`),

  getConnectorSchema: (type) =>
    _fetch(`/api/connectors/types/${type}/schema`),
}

export const activityApi = {
  list: (limit = 50, kind = null) =>
    _fetch(`/api/activity?limit=${limit}${kind ? `&kind=${kind}` : ''}`),
  clear: () =>
    _fetch('/api/activity', { method: 'DELETE' }),
}
