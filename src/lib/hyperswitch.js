import { loadHyper } from '@juspay-tech/hyper-js'

/**
 * Unified Checkout wiring.
 *
 * Only the publishable key lives here — it is designed to be public. The secret
 * key stays on the server; card details go straight from the SDK's iframes to
 * Hyperswitch and never touch our origin, which is what keeps us out of PCI
 * scope.
 *
 * loadHyper injects HyperLoader.js and picks sandbox vs production from the key
 * prefix (`pk_snd_` → sandbox). The promise is memoised so React StrictMode's
 * double-invoked effects don't inject the script twice.
 */
export const PUBLISHABLE_KEY = import.meta.env.VITE_HYPERSWITCH_PUBLISHABLE_KEY || ''

let hyperPromise = null

export function getHyper() {
  if (!PUBLISHABLE_KEY) {
    return Promise.reject(
      new Error(
        'VITE_HYPERSWITCH_PUBLISHABLE_KEY is not set. Add your sandbox publishable key to .env.local — see the README.',
      ),
    )
  }
  hyperPromise ??= loadHyper(PUBLISHABLE_KEY)
  return hyperPromise
}

/**
 * Starts fetching HyperLoader.js before the shopper reaches the payment step.
 * Called from Checkout, so the script is already parsed and the TLS connection
 * already open by the time the widget needs to mount — this is most of the
 * difference between the form appearing instantly and appearing "eventually".
 * Failures are ignored on purpose: this is an optimisation, and /payment
 * surfaces any real error itself.
 */
export function prewarmHyper() {
  getHyper().catch(() => {})
}

/** Layout and copy for the payment widget itself. */
export const unifiedCheckoutOptions = {
  layout: {
    type: 'tabs',
    defaultCollapsed: false,
  },
  paymentMethodsHeaderText: 'How would you like to pay?',
  branding: 'never',
  displaySavedPaymentMethods: false,
  // This prototype takes one off-session-free charge: no mandate, no
  // tokenization, nothing stored. Offering "Save card details" would promise a
  // capability we deliberately did not build.
  displaySavedPaymentMethodsCheckbox: false,
  terms: {
    card: 'never',
  },
}
