import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

/**
 * Server-side configuration. Everything in here is secret or infrastructural
 * and must never be surfaced to the browser — no value from this module may
 * appear in an API response body.
 */

// Match Vite's precedence so one file configures both halves of the app:
// .env.local wins over .env, and neither overrides a real environment
// variable (which is how Vercel injects them in production).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({
  path: [path.join(root, '.env.local'), path.join(root, '.env')],
  quiet: true,
})

const {
  HYPERSWITCH_SECRET_KEY,
  HYPERSWITCH_PROFILE_ID,
  HYPERSWITCH_PAYMENT_RESPONSE_HASH_KEY,
  HYPERSWITCH_BASE_URL = 'https://sandbox.hyperswitch.io',
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  APP_BASE_URL,
  PORT = 3001,
  VERCEL_URL,
} = process.env

// On Vercel, VERCEL_URL is the deployment host without a scheme. Prefer an
// explicit APP_BASE_URL so preview deployments don't build return_urls that
// point at a URL the shopper never visited.
const appBaseUrl = (
  APP_BASE_URL || (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:5173')
).replace(/\/+$/, '')

export const config = {
  hyperswitch: {
    secretKey: HYPERSWITCH_SECRET_KEY,
    profileId: HYPERSWITCH_PROFILE_ID || null,
    paymentResponseHashKey: HYPERSWITCH_PAYMENT_RESPONSE_HASH_KEY,
    baseUrl: HYPERSWITCH_BASE_URL.replace(/\/+$/, ''),
  },
  supabase: {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  },
  appBaseUrl,
  port: Number(PORT),
}

/** The single plan this prototype sells. Amount is in minor units. */
export const PLAN = {
  id: 'monthly_kick',
  name: 'The Monthly Kick',
  amountCents: 4900,
  currency: 'USD',
  description: 'The Monthly Kick — 12 oz single-origin, roasted to order',
}

const REQUIRED = [
  ['HYPERSWITCH_SECRET_KEY', config.hyperswitch.secretKey],
  ['HYPERSWITCH_PAYMENT_RESPONSE_HASH_KEY', config.hyperswitch.paymentResponseHashKey],
  ['SUPABASE_URL', config.supabase.url],
  ['SUPABASE_SERVICE_ROLE_KEY', config.supabase.serviceRoleKey],
]

/** Names of required env vars that are missing or still set to a placeholder. */
export function missingConfig() {
  return REQUIRED.filter(([, value]) => !value || /replace_me/i.test(value)).map(([name]) => name)
}

/**
 * Guard used by every route that touches Hyperswitch or Supabase. Fails loudly
 * and early rather than producing a confusing 500 from deep inside a fetch.
 */
export function assertConfigured() {
  const missing = missingConfig()
  if (missing.length) {
    const error = new Error(
      `Server is not configured. Missing environment variables: ${missing.join(', ')}. ` +
        'Set them in .env.local (or .env) — the full list is in the README.',
    )
    error.statusCode = 503
    error.publicMessage =
      'Payments are not configured on this deployment yet. Check the server environment variables.'
    throw error
  }
}
