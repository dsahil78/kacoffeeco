/**
 * Reproduces what the Hyperswitch router does, then checks our verifier agrees.
 *
 * Rust side (crates/router/src/core/payments/helpers.rs):
 *   make_merchant_url_with_response -> Url::parse_with_params(return_url, [...])
 *   make_url_with_signature         -> hmac_sha512_sorted_query_params(url.query_pairs(), key)
 *                                      then appends signature + signature_algorithm
 *   hmac_sha512_sorted_query_params -> params.sort(); join "k=v" with "&"; HMAC-SHA512; hex
 */
import crypto from 'node:crypto'

const KEY = 'a'.repeat(64)
process.env.HYPERSWITCH_PAYMENT_RESPONSE_HASH_KEY = KEY
process.env.HYPERSWITCH_SECRET_KEY = 'snd_test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'

const { verifyRedirectSignature, verifyWebhookSignature } = await import(
  './verifySignature.js'
)

let failures = 0
const check = (name, actual, expected = true) => {
  const ok = actual === expected
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}

/** Mirrors Rust's `params.sort()` over (Cow<str>, Cow<str>) tuples. */
function rustSign(pairs, key) {
  const sorted = [...pairs].sort((a, b) => {
    const k = Buffer.compare(Buffer.from(a[0], 'utf8'), Buffer.from(b[0], 'utf8'))
    return k !== 0 ? k : Buffer.compare(Buffer.from(a[1], 'utf8'), Buffer.from(b[1], 'utf8'))
  })
  const message = sorted.map(([k, v]) => `${k}=${v}`).join('&')
  return { message, sig: crypto.createHmac('sha512', key).update(message).digest('hex') }
}

/** Builds the redirect URL exactly the way the router does. */
function buildRedirect(returnUrl, params) {
  const url = new URL(returnUrl)
  for (const [k, v] of params) url.searchParams.append(k, v)
  const pairs = [...url.searchParams.entries()] // percent-decoded, like query_pairs()
  const { sig } = rustSign(pairs, KEY)
  url.searchParams.append('signature', sig)
  url.searchParams.append('signature_algorithm', 'HMAC-SHA512')
  return url
}

// --- 1. the ordinary success redirect -------------------------------------
{
  const url = buildRedirect('https://kickass.coffee/confirmation?order_id=6f1e8c2a-1111-4aaa-9bbb-0123456789ab', [
    ['status', 'succeeded'],
    ['payment_id', 'pay_LxT9vc19f8aa75OpFxH8'],
    ['payment_intent_client_secret', 'pay_LxT9vc19f8aa75OpFxH8_secret_V4zAc7V0C8WAw6FECMKM'],
    ['amount', '4900'],
    ['manual_retry_allowed', 'false'],
  ])
  const params = Object.fromEntries(new URL(url).searchParams.entries())
  check('accepts a genuine success redirect', verifyRedirectSignature(params).valid)
}

// --- 2. failure redirect, and one without our order_id ---------------------
{
  const url = buildRedirect('https://kickass.coffee/confirmation', [
    ['status', 'failed'],
    ['payment_id', 'pay_zzz'],
    ['payment_intent_client_secret', 'pay_zzz_secret_abc'],
    ['amount', '4900'],
    ['manual_retry_allowed', 'true'],
  ])
  const params = Object.fromEntries(new URL(url).searchParams.entries())
  check('accepts a genuine failure redirect', verifyRedirectSignature(params).valid)
}

// --- 3. values that percent-encode ----------------------------------------
{
  const url = buildRedirect('https://kickass.coffee/confirmation?note=a%20b%26c', [
    ['status', 'succeeded'],
    ['payment_id', 'pay_+/=slash'],
    ['amount', '4900'],
  ])
  const params = Object.fromEntries(new URL(url).searchParams.entries())
  check('accepts values needing percent-encoding', verifyRedirectSignature(params).valid)
}

// --- 4. tampering must be rejected ----------------------------------------
{
  const url = buildRedirect('https://kickass.coffee/confirmation?order_id=abc', [
    ['status', 'failed'],
    ['payment_id', 'pay_zzz'],
    ['amount', '4900'],
  ])
  const params = Object.fromEntries(new URL(url).searchParams.entries())

  check('rejects a flipped status', verifyRedirectSignature({ ...params, status: 'succeeded' }).valid, false)
  check('rejects an added param', verifyRedirectSignature({ ...params, evil: '1' }).valid, false)
  check('rejects a dropped param', verifyRedirectSignature({ ...params, amount: undefined }).valid, false)
  check('rejects a forged signature', verifyRedirectSignature({ ...params, signature: 'de'.repeat(64) }).valid, false)
  check('rejects a missing signature', verifyRedirectSignature({ status: 'succeeded' }).valid, false)
  check('rejects a junk signature', verifyRedirectSignature({ ...params, signature: 'not-hex' }).valid, false)
  check(
    'rejects an unsupported algorithm',
    verifyRedirectSignature({ ...params, signature_algorithm: 'HMAC-SHA1' }).valid,
    false,
  )
}

// --- 5. webhook: HMAC over the exact bytes sent ----------------------------
{
  // Key order here is deliberately not what JSON.stringify would produce from a
  // reparse — that is the whole reason we hash the raw buffer.
  const body = '{"event_type":"payment_succeeded","event_id":"evt_123","merchant_id":"m1","content":{"type":"payment_details","object":{"payment_id":"pay_1","status":"succeeded"}}}'
  const raw = Buffer.from(body, 'utf8')
  const sig512 = crypto.createHmac('sha512', KEY).update(raw).digest('hex')
  const sig256 = crypto.createHmac('sha256', KEY).update(raw).digest('hex')

  check('accepts a valid x-webhook-signature-512', verifyWebhookSignature(raw, { 'x-webhook-signature-512': sig512 }).valid)
  check('accepts the 256 fallback header', verifyWebhookSignature(raw, { 'x-webhook-signature-256': sig256 }).valid)
  check('rejects a tampered body', verifyWebhookSignature(Buffer.from(body.replace('succeeded', 'failed')), { 'x-webhook-signature-512': sig512 }).valid, false)
  check('rejects a missing header', verifyWebhookSignature(raw, {}).valid, false)
  check('rejects a non-buffer body (re-serialised JSON)', verifyWebhookSignature(JSON.parse(body), { 'x-webhook-signature-512': sig512 }).valid, false)
  check(
    'rejects 512 signature presented in the 256 header slot',
    verifyWebhookSignature(raw, { 'x-webhook-signature-256': sig512 }).valid,
    false,
  )
}

console.log(failures === 0 ? '\nAll signature checks passed.' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
