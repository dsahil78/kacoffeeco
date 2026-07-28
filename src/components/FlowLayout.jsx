import { Nav } from './Nav.jsx'
import { Footer } from './Footer.jsx'
import { PLAN, formatMoney } from '../lib/plan.js'
import '../styles/flow.css'

const STEPS = ['Details', 'Payment', 'Confirmation']

/** Shared chrome for the three checkout-flow pages. */
export function FlowLayout({ step, children }) {
  return (
    <div className="wrap">
      <Nav compact />
      <main id="main" className="flow">
        <Steps current={step} />
        {children}
      </main>
      <Footer />
    </div>
  )
}

function Steps({ current }) {
  return (
    <ol className="steps" aria-label="Checkout progress">
      {STEPS.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        return (
          <li key={label} className={`step step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="step-dot" aria-hidden="true">
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span className="step-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The order summary rail. Identical on Checkout and Payment so the shopper can
 * see what they are paying for right up to the moment they pay for it.
 */
export function OrderSummary({ children }) {
  return (
    <aside className="summary" aria-label="Order summary">
      <div className="summary-card">
        <span className="eyebrow">Your order</span>
        <h2 className="summary-name">{PLAN.name}</h2>
        <p className="summary-blurb">{PLAN.blurb}</p>

        <dl className="summary-lines">
          <div>
            <dt>Subscription</dt>
            <dd>{formatMoney(PLAN.amountCents)} / {PLAN.cadence}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>Free</dd>
          </div>
        </dl>

        <div className="summary-total">
          <span>Due today</span>
          <span className="summary-total-amt">{formatMoney(PLAN.amountCents)}</span>
        </div>

        <p className="summary-fine">
          A single {formatMoney(PLAN.amountCents)} charge for this month's bag. Skip or cancel
          before the next one, anytime.
        </p>

        {children}
      </div>
    </aside>
  )
}
