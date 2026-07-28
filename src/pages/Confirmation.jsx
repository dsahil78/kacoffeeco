import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FlowLayout } from '../components/FlowLayout.jsx'
import { CremaSeal } from '../components/CremaSeal.jsx'
import { confirmOrder, getOrder } from '../lib/api.js'
import { forgetCheckout } from '../lib/session.js'
import { formatMoney } from '../lib/plan.js'

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

  if (order.status === 'succeeded') return <Shell><Succeeded order={order} /></Shell>
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

function Succeeded({ order }) {
  return (
    <>
      <div className="confirm-mark confirm-mark--good">
        <span className="pulse" aria-hidden="true" />
        <CremaSeal size={72} decorative />
      </div>
      <span className="eyebrow">Payment confirmed</span>
      <h1 className="flow-title">
        Welcome to the <em>Kick.</em>
      </h1>
      <p className="flow-lede">
        We took {formatMoney(order.amount_cents, order.currency)} and your first bag is already on
        the roast list.{' '}
        {order.email ? (
          <>
            The confirmation is on its way to <strong>{order.email}</strong>.
          </>
        ) : (
          'Your confirmation email is on its way.'
        )}
      </p>

      <ol className="next-steps">
        <li>
          <strong>Tomorrow</strong> — your beans go in the roaster. Small batch, medium roast,
          ground for your brew.
        </li>
        <li>
          <strong>Within 48 hours</strong> — the bag ships carbon-neutral, with tracking in your
          inbox.
        </li>
        <li>
          <strong>Next month</strong> — we do it again. Skip or cancel any time, no phone call
          required.
        </li>
      </ol>

      <OrderMeta order={order} />

      <Link to="/" className="btn btn-dark lg">
        Back to the roast
      </Link>
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
        <dd className="mono">{order.id.slice(0, 8)}</dd>
      </div>
      <div>
        <dt>Plan</dt>
        <dd>The Monthly Kick</dd>
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
