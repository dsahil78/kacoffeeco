import { config, PLAN } from '../config.js'

/**
 * Thin wrapper over the Hyperswitch v1 REST API.
 *
 * Auth is the secret key (`snd_...`) in the `api-key` header — server-side only.
 * Docs: https://api-reference.hyperswitch.io/v1/payments/payments--create
 */
async function request(path, { method = 'POST', body, query } = {}) {
  const url = new URL(`${config.hyperswitch.baseUrl}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    method,
    headers: {
      'api-key': config.hyperswitch.secretKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    const detail = payload?.error?.message || payload?.error?.reason || text || response.statusText
    const error = new Error(`Hyperswitch ${method} ${path} failed (${response.status}): ${detail}`)
    error.statusCode = response.status >= 500 ? 502 : 400
    error.hyperswitch = payload?.error ?? null
    throw error
  }

  return payload
}

/**
 * Creates a Hyperswitch customer. Hyperswitch generates the customer_id when we
 * don't supply one; we persist whatever comes back and reuse it for repeat
 * emails, so a returning guest keeps a single customer record.
 */
export async function createCustomer({ email, fullName, phone }) {
  const customer = await request('/customers', {
    body: {
      email,
      name: fullName || undefined,
      phone: phone || undefined,
      description: 'Kick Ass Coffee Co. guest checkout',
    },
  })
  return customer.customer_id
}

/**
 * Creates the payment intent for one month of The Monthly Kick.
 *
 * `confirm: false` means Hyperswitch returns a `client_secret` for the Unified
 * Checkout SDK to confirm from the browser — no card data ever reaches us, so
 * we stay out of PCI scope. This is deliberately a one-off charge: no mandate,
 * no `setup_future_usage`, no tokenization.
 */
export async function createPayment({ orderId, customerId, email, shipping, returnUrl }) {
  const address = {
    line1: shipping.line1,
    line2: shipping.line2 || undefined,
    city: shipping.city,
    state: shipping.state,
    zip: shipping.zip,
    country: shipping.country,
    first_name: shipping.firstName,
    last_name: shipping.lastName || undefined,
  }

  return request('/payments', {
    body: {
      amount: PLAN.amountCents,
      currency: PLAN.currency,
      confirm: false,
      capture_method: 'automatic',
      authentication_type: 'three_ds',
      customer_id: customerId,
      ...(config.hyperswitch.profileId ? { profile_id: config.hyperswitch.profileId } : {}),
      return_url: returnUrl,
      description: PLAN.description,
      statement_descriptor_name: 'KickAssCoffee',
      metadata: { order_id: orderId, plan: PLAN.id },
      shipping: { address, email },
      billing: { address, email },
    },
  })
}

/**
 * Reads the authoritative payment state back from Hyperswitch.
 * `force_sync` makes Hyperswitch poll the underlying connector rather than
 * answering from its own cached intent status.
 */
export async function retrievePayment(paymentId, { forceSync = true } = {}) {
  return request(`/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    query: { force_sync: forceSync },
  })
}

/**
 * Maps a Hyperswitch payment status onto our four order states.
 * Statuses: requires_payment_method | requires_confirmation | requires_capture |
 * requires_customer_action | processing | succeeded | failed | cancelled | ...
 */
export function toOrderStatus(paymentStatus) {
  switch (paymentStatus) {
    case 'succeeded':
    case 'partially_captured':
    case 'partially_captured_and_capturable':
      return 'succeeded'
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'failed'
    case 'processing':
    case 'requires_capture':
    case 'requires_customer_action':
    case 'requires_confirmation':
      return 'processing'
    case 'requires_payment_method':
      return 'created'
    default:
      return null
  }
}
