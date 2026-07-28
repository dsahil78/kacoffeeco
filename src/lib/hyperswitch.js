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
        'VITE_HYPERSWITCH_PUBLISHABLE_KEY is not set. Copy .env.example to .env and add your sandbox publishable key.',
      ),
    )
  }
  hyperPromise ??= loadHyper(PUBLISHABLE_KEY)
  return hyperPromise
}

/**
 * Themes the widget to match the rest of the site. Values mirror the tokens in
 * styles/theme.css — the SDK renders in a cross-origin iframe, so our CSS
 * cannot reach it and every value has to be passed through explicitly.
 */
export const appearance = {
  theme: 'soft',
  variables: {
    colorPrimary: '#C6892C',
    colorBackground: '#FBF5E9',
    colorText: '#241309',
    colorTextSecondary: '#8A6F52',
    colorTextPlaceholder: '#A88E6C',
    colorDanger: '#5A1A20',
    colorSuccess: '#4A6B3A',
    colorWarning: '#A66E1E',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSizeBase: '16px',
    spacingUnit: '4px',
    borderRadius: '12px',
    buttonBackgroundColor: '#C6892C',
    buttonTextColor: '#2A1608',
    buttonBorderRadius: '999px',
    buttonHeight: '52px',
    buttonTextFontSize: '16px',
    buttonTextFontWeight: '600',
  },
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
  terms: {
    card: 'never',
  },
}
