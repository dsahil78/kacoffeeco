import { Nav } from './Nav.jsx'
import { Footer } from './Footer.jsx'
import { ProductFrame } from './ProductFrame.jsx'
import { CoffeeBag } from './art/CoffeeBag.jsx'
import { PLAN, formatMoney, nextRoastLabel } from '../lib/plan.js'
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
          <li
            key={label}
            className={`step step--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="step-dot" aria-hidden="true">
              {state === 'done' ? <Tick /> : index + 1}
            </span>
            <span className="step-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The order summary rail — identical on Checkout and Payment, so the shopper can
 * see exactly what they are buying right up to the moment they pay for it.
 *
 * Deliberately detailed: at the point of handing over a card, specifics
 * (origin, roast, what ships when) do more to reassure than reassuring words.
 */
export function OrderSummary({ children }) {
  const { spec } = PLAN

  return (
    <aside className="summary" aria-label="Order summary">
      <div className="summary-card">
        <div className="summary-head">
          <ProductFrame ratio="1 / 1" tone="dark" className="summary-media">
            <CoffeeBag />
          </ProductFrame>
          <div className="summary-id">
            <span className="eyebrow">Your order</span>
            <h2 className="summary-name">{PLAN.name}</h2>
            <p className="summary-origin">{spec.origin}</p>
          </div>
        </div>

        <p className="summary-notes">
          <TasteIcon />
          {spec.notes}
        </p>

        <dl className="summary-spec">
          <div>
            <dt>Roast</dt>
            <dd>{spec.roast}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{spec.size}</dd>
          </div>
          <div>
            <dt>Lot</dt>
            <dd>{spec.lot}</dd>
          </div>
          <div>
            <dt>Grind</dt>
            <dd>{spec.grind}</dd>
          </div>
        </dl>

        <dl className="summary-lines">
          <div>
            <dt>Subscription</dt>
            <dd>
              {formatMoney(PLAN.amountCents)} / {PLAN.cadence}
            </dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd className="is-free">Free</dd>
          </div>
        </dl>

        <div className="summary-total">
          <span>Due today</span>
          <span className="summary-total-amt">{formatMoney(PLAN.amountCents)}</span>
        </div>

        <ul className="summary-assure">
          <li>
            <Dot />
            Roasts {nextRoastLabel()}, ships within 48 hours
          </li>
          <li>
            <Dot />
            Skip or cancel before the next bag, anytime
          </li>
          <li>
            <Dot />
            One {formatMoney(PLAN.amountCents)} charge today — nothing hidden
          </li>
        </ul>

        {children}
      </div>
    </aside>
  )
}

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Dot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="var(--crema-lo)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TasteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3c3.5 3 5.5 5.7 5.5 8.7A5.5 5.5 0 0112 17.2a5.5 5.5 0 01-5.5-5.5C6.5 8.7 8.5 6 12 3z"
        stroke="var(--crema-lo)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 17.2V21" stroke="var(--crema-lo)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
