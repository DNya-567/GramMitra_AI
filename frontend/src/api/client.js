// Shared fetch wrapper -- every api/*.js file uses this so the
// Authorization header and base URL logic lives in exactly one place.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
