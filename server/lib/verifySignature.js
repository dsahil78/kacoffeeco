import crypto from 'node:crypto'
import { config } from '../config.js'

/** Length-safe constant-time compare of two hex digests. */
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const left = Buffer.from(a.trim().toLowerCase(), 'hex')
  const right = Buffer.from(b.trim().toLowerCase(), 'hex')
  if (left.length === 0 || left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

function hmacSha512Hex(message) {
  return crypto
    .createHmac('sha512', config.hyperswitch.paymentResponseHashKey)
    .update(message)
    .digest('hex')
}

/**
 * Verifies an outgoing-webhook delivery.
 *
 * Hyperswitch signs the *exact JSON bytes it sent* with the business profile's
 * `payment_response_hash_key` and puts the hex digest in `x-webhook-signature-512`
 * (see `OutgoingWebhookType::get_outgoing_webhooks_signature` in the router).
 * That means we must hash the raw request buffer — re-serialising the parsed
 * JSON would reorder or reformat keys and produce a different digest.
 *
 * @param {Buffer} rawBody exact bytes of the request body
 * @param {object} headers incoming request headers
 */
export function verifyWebhookSignature(rawBody, headers) {
  const provided =
    headers['x-webhook-signature-512'] ||
    headers['x-webhook-signature'] ||
    headers['x-webhook-signature-256']

  if (!provided) return { valid: false, reason: 'missing_signature_header' }
  if (!Buffer.isBuffer(rawBody)) return { valid: false, reason: 'raw_body_unavailable' }

  // The 256 header is a documented fallback for hosts without SHA-512.
  const algorithm = headers['x-webhook-signature-512'] ? 'sha512' : 'sha256'
  const expected = crypto
    .createHmac(algorithm, config.hyperswitch.paymentResponseHashKey)
    .update(rawBody)
    .digest('hex')

  return timingSafeEqualHex(expected, String(provided))
    ? { valid: true }
    : { valid: false, reason: 'signature_mismatch' }
}

/**
 * Verifies the signature Hyperswitch appends to the `return_url` redirect.
 *
 * From `make_url_with_signature` / `hmac_sha512_sorted_query_params` in the
 * router: every query parameter present *before* `signature` and
 * `signature_algorithm` are appended is collected as percent-decoded
 * (key, value) pairs, sorted, joined as `key=value` with `&`, then signed with
 * HMAC-SHA512 and hex-encoded.
 *
 * The redirect is only a UX signal — the DB, fed by the webhook, stays the
 * source of truth. We verify it so we never render a status derived from query
 * params a shopper could have typed themselves.
 *
 * @param {Record<string,string>} params the redirect query parameters
 */
export function verifyRedirectSignature(params) {
  const { signature, signature_algorithm: algorithm, ...signed } = params ?? {}

  if (!signature) return { valid: false, reason: 'missing_signature' }
  if (algorithm && algorithm.toUpperCase().replace(/[^A-Z0-9]/g, '') !== 'HMACSHA512') {
    return { valid: false, reason: `unsupported_algorithm:${algorithm}` }
  }

  const message = Object.entries(signed)
    .map(([key, value]) => [String(key), value == null ? '' : String(value)])
    .sort((a, b) => (a[0] === b[0] ? compare(a[1], b[1]) : compare(a[0], b[0])))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return timingSafeEqualHex(hmacSha512Hex(message), String(signature))
    ? { valid: true }
    : { valid: false, reason: 'signature_mismatch' }
}

/** Byte-wise comparison, matching Rust's `sort()` on string tuples. */
function compare(a, b) {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  return Buffer.compare(left, right)
}
