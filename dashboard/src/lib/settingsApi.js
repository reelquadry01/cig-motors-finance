const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''

export async function getSettings() {
  const res = await fetch(`${API_BASE}/api/settings`)
  if (!res.ok) return null
  return res.json()
}

export async function updateSettings(patch) {
  const { getToken } = await import('./api')
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Failed to update settings')
  return res.json()
}
