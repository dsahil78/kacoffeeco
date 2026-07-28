/**
 * Client for our own Express API.
 *
 * VITE_API_BASE_URL is normally empty so requests go same-origin: Vite proxies
 * /api to the dev server, and Vercel rewrites /api/* to the function.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

/** Error carrying the API's per-field validation messages, if any. */
export class ApiError extends Error {
  constructor(message, { status, fields } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields ?? null
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('We could not reach the kitchen. Check your connection and try again.')
  }

  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ApiError(payload?.error || `Request failed (${response.status})`, {
      status: response.status,
      fields: payload?.fields,
    })
  }

  return payload
}

/** Creates the Hyperswitch payment and our order row. Returns the client_secret. */
export function createPayment(checkout, options) {
  return request('/payments', { method: 'POST', body: checkout, ...options })
}

/** Reads an order's status from our database. */
export function getOrder(orderId, options) {
  return request(`/orders/${encodeURIComponent(orderId)}`, options)
}

/**
 * Hands the return_url query parameters to the server so it can verify their
 * HMAC signature, then reads the order back from our database.
 */
export function confirmOrder(orderId, params, options) {
  return request(`/orders/${encodeURIComponent(orderId)}/confirm`, {
    method: 'POST',
    body: { params },
    ...options,
  })
}
