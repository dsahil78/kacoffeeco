import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FlowLayout } from '../components/FlowLayout.jsx'
import { CremaSeal } from '../components/CremaSeal.jsx'
import { confirmOrder, getOrder } from '../lib/api.js'
import { forgetCheckout } from '../lib/session.js'
import { formatMoney, nextRoastLabel, PLAN } from '../lib/plan.js'

/**
 * Poll while the payment is still in flight. Webhook delivery is quick but not
 * instant, and the shopper lands here the moment the redirect completes.
 */
const POLL_INTERVAL_MS = 2000
const POLL_ATTEMPTS = 8

export default function Confirmation() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')

  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)

  // A stable primitive to depend on. `searchParams` is a fresh object on every
  // render, which would otherwise restart this effect in a loop.
  const query = searchParams.toString()

  useEffect(() => {
    if (!orderId) return undefined

    const controller = new AbortController()
    let cancelled = false
    let timer = null

    // Everything Hyperswitch appended to our return_url. The server verifies
    // the HMAC signature over these before it trusts any of them — and even
    // then, the status we render comes from our own database.
    const redirectParams = Object.fromEntries(new URLSearchParams(query).entries())

    ;(async () => {
      try {
        const first = await confirmOrder(orderId, redirectParams, { signal: controller.signal })
        if (cancelled) return
        setOrder(first.order)
        setLoading(false)

        if (isTerminal(first.order.status)) {
          forgetCheckout()
          return
        }

        setSettling(true)
        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
          await new Promise((resolve) => {
            timer = setTimeout(resolve, POLL_INTERVAL_MS)
          })
          if (cancelled) return

          const next = await getOrder(orderId, { signal: controller.signal })
          if (cancelled) return
          setOrder(next.order)
          if (isTerminal(next.order.status)) {
            forgetCheckout()
            break
          }
        }
        setSettling(false)
      } catch (loadError) {
        // An abort means this effect was superseded — StrictMode's second pass
        // re-runs it, so there is nothing to report.
        if (cancelled || loadError.name === 'AbortError') return
        setError(loadError.message)
        setLoading(false)
        setSettling(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [orderId, query])

  if (!orderId) return <Shell><NoOrder /></Shell>
  if (loading) return <Shell><Loading /></Shell>
  if (error) return <Shell><Failed title="We lost the thread" body={error} /></Shell>

  if (order.status === 'succeeded') return <Celebration order={order} />
  if (order.status === 'failed') return <Shell><Declined order={order} /></Shell>
  return <Shell><Pending order={order} settling={settling} /></Shell>
}

function isTerminal(status) {
  return status === 'succeeded' || status === 'failed'
}

function Shell({ children }) {
  return (
    <FlowLayout step={2}>
      <section className="flow-empty confirm">{children}</section>
    </FlowLayout>
  )
}

/* ------------------------------------------------------------------ *
 * The moment worth designing for.
 * ------------------------------------------------------------------ */
function Celebration({ order }) {
  return (
    <FlowLayout step={2}>
      <section className="celebrate">
        <Confetti />

        <div className="celebrate-seal">
          <span className="ring ring-1" aria-hidden="true" />
          <span className="ring ring-2" aria-hidden="true" />
          <span className="rays" aria-hidden="true" />
          <CremaSeal size={92} decorative />
        </div>

        <span className="eyebrow celebrate-eyebrow">You're in · Member #{shortId(order.id)}</span>

        <h1 className="celebrate-title">
          Welcome to the
          <br />
          <em>Kick Ass Coffee Club.</em>
        </h1>

        <p className="celebrate-lede">
          That's {formatMoney(order.amount_cents, order.currency)} well spent. Your first bag of{' '}
          {PLAN.spec.origin} is on the roast list, and the good mornings start {nextRoastLabel()}.
        </p>

        {/* A keepsake, not a receipt. */}
        <div className="member-card">
          <div className="member-card-top">
            <CremaSeal size={34} decorative />
            <span className="member-card-brand">
              <strong>Kick Ass</strong>
              <em>Coffee Club</em>
            </span>
            <span className="member-card-badge">Founding member</span>
          </div>
          <div className="member-card-rows">
            <div>
              <dt>Member</dt>
              <dd>{order.email ?? 'You'}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{PLAN.name}</dd>
            </div>
            <div>
              <dt>Order</dt>
              <dd className="mono">{shortId(order.id)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="status status--succeeded">Confirmed</dd>
            </div>
          </div>
        </div>

        <h2 className="celebrate-next-title">What happens now</h2>
        <ol className="next-steps">
          <li>
            <span className="next-when">{nextRoastLabel()}</span>
            <span className="next-what">
              <strong>Your beans hit the roaster.</strong> Small batch, medium roast, ground for
              your brew — or whole, if that's your thing.
            </span>
          </li>
          <li>
            <span className="next-when">Within 48 hrs</span>
            <span className="next-what">
              <strong>It ships, carbon-neutral.</strong> Tracking lands in your inbox the moment the
              bag leaves us.
            </span>
          </li>
          <li>
            <span className="next-when">Every month</span>
            <span className="next-what">
              <strong>A new lot, same standard.</strong> Skip one, change your grind, or walk away —
              two clicks, no phone call.
            </span>
          </li>
        </ol>

        <div className="celebrate-actions">
          <Link to="/" className="btn btn-primary lg">
            Explore the roast
          </Link>
          <span className="celebrate-fine">
            A confirmation is on its way{order.email ? ` to ${order.email}` : ''}.
          </span>
        </div>
      </section>
    </FlowLayout>
  )
}

/**
 * Twelve falling beans. Decorative, hidden from assistive tech, and reduced to
 * nothing by the reduced-motion rules in theme.css.
 */
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className={`confetti-bit c${i % 4}`} style={{ '--i': i }} />
      ))}
    </div>
  )
}

function Loading() {
  return (
    <>
      <div className="confirm-mark" aria-hidden="true">
        <CremaSeal size={72} decorative />
      </div>
      <h1 className="flow-title">Checking the books…</h1>
      <p className="flow-lede">One moment while we confirm the payment went through.</p>
    </>
  )
}

function Declined({ order }) {
  return (
    <>
      <div className="confirm-mark confirm-mark--bad" aria-hidden="true">
        <CremaSeal size={72} decorative />
      </div>
      <span className="eyebrow eyebrow--bad">Payment not completed</span>
      <h1 className="flow-title">
        That card said <em>no.</em>
      </h1>
      <p className="flow-lede">
        Nothing was charged and nothing was shipped. Declines are usually the bank being cautious —
        a different card almost always clears it.
      </p>

      <OrderMeta order={order} />

      <div className="confirm-actions">
        <Link to="/checkout" className="btn btn-primary lg">
          Try another card
        </Link>
        <Link to="/" className="btn btn-ghost">
          Back to the roast
        </Link>
      </div>
    </>
  )
}

function Pending({ order, settling }) {
  return (
    <>
      <div className="confirm-mark" aria-hidden="true">
        <CremaSeal size={72} decorative />
      </div>
      <span className="eyebrow">Payment processing</span>
      <h1 className="flow-title">
        Still <em>brewing.</em>
      </h1>
      <p className="flow-lede">
        Your bank has not given us a final answer yet. This page updates itself — leave it open for
        a moment, or check your email, and we will confirm the moment it settles.
      </p>

      {settling && (
        <p className="confirm-polling">
          <span className="spinner" aria-hidden="true" />
          Watching for confirmation…
        </p>
      )}

      <OrderMeta order={order} />

      <Link to="/" className="btn btn-ghost">
        Back to the roast
      </Link>
    </>
  )
}

function NoOrder() {
  return (
    <>
      <div className="confirm-mark" aria-hidden="true">
        <CremaSeal size={72} decorative />
      </div>
      <h1 className="flow-title">
        Nothing to <em>confirm.</em>
      </h1>
      <p className="flow-lede">
        We could not tell which order you meant. If you just paid, check your inbox for the
        confirmation — otherwise, start a fresh one.
      </p>
      <Link to="/checkout" className="btn btn-primary lg">
        Start a subscription
      </Link>
    </>
  )
}

function Failed({ title, body }) {
  return (
    <>
      <div className="confirm-mark confirm-mark--bad" aria-hidden="true">
        <CremaSeal size={72} decorative />
      </div>
      <h1 className="flow-title">{title}</h1>
      <p className="flow-lede">{body}</p>
      <Link to="/" className="btn btn-ghost">
        Back to the roast
      </Link>
    </>
  )
}

function OrderMeta({ order }) {
  return (
    <dl className="confirm-meta">
      <div>
        <dt>Order</dt>
        <dd className="mono">{shortId(order.id)}</dd>
      </div>
      <div>
        <dt>Plan</dt>
        <dd>{PLAN.name}</dd>
      </div>
      <div>
        <dt>Amount</dt>
        <dd>{formatMoney(order.amount_cents, order.currency)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd className={`status status--${order.status}`}>{order.status}</dd>
      </div>
    </dl>
  )
}

function shortId(id) {
  return String(id).slice(0, 8).toUpperCase()
}
