/**
 * One product, one plan. Amounts are in minor units everywhere — the server
 * uses the same numbers, and Hyperswitch expects 4900 for $49.00.
 */
export const PLAN = {
  id: 'monthly_kick',
  name: 'The Monthly Kick',
  amountCents: 4900,
  currency: 'USD',
  cadence: 'month',
  blurb: '12 oz of single-origin, roasted to order and ground for your brew.',
  features: [
    '12 oz single-origin, specialty grade',
    'Roasted the day it ships — on your counter within 48 hours',
    'Ground to your brew method, or whole bean',
    'Free carbon-neutral shipping, always',
    'Skip a month or cancel in two clicks',
  ],
}

const formatters = new Map()

export function formatMoney(cents, currency = PLAN.currency) {
  if (!formatters.has(currency)) {
    formatters.set(
      currency,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      }),
    )
  }
  return formatters.get(currency).format(cents / 100)
}
