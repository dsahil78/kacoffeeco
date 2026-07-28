/**
 * Short-lived checkout handoff between /checkout, /payment and /confirmation.
 *
 * Router state alone would be lost on a refresh, and a shopper who reloads the
 * payment page should not have to re-enter their address. sessionStorage is the
 * right scope: it dies with the tab, and it only ever holds the client_secret
 * (already public, and scoped to this one payment) plus our own order id.
 */
const KEY = 'kacc.checkout'

export function rememberCheckout(value) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...value, at: Date.now() }))
  } catch {
    // Private browsing or a full quota — the router state still covers the
    // happy path, so this is not worth failing checkout over.
  }
}

export function recallCheckout() {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function forgetCheckout() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to clean up */
  }
}
