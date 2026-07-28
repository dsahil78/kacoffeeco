import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FlowLayout, OrderSummary } from '../components/FlowLayout.jsx'
import { getHyper, appearance, unifiedCheckoutOptions } from '../lib/hyperswitch.js'
import { recallCheckout } from '../lib/session.js'
import { PLAN, formatMoney } from '../lib/plan.js'

const MOUNT_ID = 'unified-checkout'

export default function Payment() {
  const navigate = useNavigate()
  const location = useLocation()

  // Router state on the happy path; sessionStorage after a refresh.
  const handoff = location.state?.clientSecret ? location.state : recallCheckout()
  const clientSecret = handoff?.clientSecret ?? null
  const orderId = handoff?.orderId ?? null

  const [ready, setReady] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)

  // Held in refs, not state: these are imperative SDK handles, and putting them
  // in state would re-render the page every time the widget re-initialises.
  const hyperRef = useRef(null)
  const widgetsRef = useRef(null)

  useEffect(() => {
    if (!clientSecret) return undefined

    let cancelled = false
    let element = null

    ;(async () => {
      try {
        const hyper = await getHyper()
        if (cancelled) return

        // widgets() carries the client_secret; the SDK then talks to
        // Hyperswitch directly for the payment methods available on it.
        const widgets = hyper.widgets({ clientSecret, appearance })
        const unifiedCheckout = widgets.create('payment', unifiedCheckoutOptions)
        unifiedCheckout.mount(`#${MOUNT_ID}`)

        hyperRef.current = hyper
        widgetsRef.current = widgets
        element = unifiedCheckout
        setReady(true)
      } catch (mountError) {
        if (cancelled) return
        console.error('[payment] failed to mount Unified Checkout', mountError)
        setError(
          mountError.message ||
            'We could not load the payment form. Refresh the page and try again.',
        )
      }
    })()

    return () => {
      // StrictMode invokes effects twice in development; tearing the widget
      // down here keeps the second mount from stacking a duplicate iframe.
      cancelled = true
      try {
        element?.unmount?.()
        element?.destroy?.()
      } catch {
        /* the widget was already gone */
      }
      widgetsRef.current = null
      setReady(false)
    }
  }, [clientSecret])

  const onPay = useCallback(async () => {
    if (!hyperRef.current || !widgetsRef.current || confirming) return

    setConfirming(true)
    setError(null)

    const returnUrl = `${window.location.origin}/confirmation?order_id=${encodeURIComponent(orderId)}`

    try {
      // `redirect: "always"` sends every payment back through return_url, so
      // the Confirmation page runs the same way for 3DS and non-3DS cards.
      // `widgets` and `elements` are the same handle under two names across SDK
      // versions and docs; `redirect` is read from both the top level and
      // confirmParams depending on the flow, so it goes in both places.
      const result = await hyperRef.current.confirmPayment({
        widgets: widgetsRef.current,
        elements: widgetsRef.current,
        confirmParams: { return_url: returnUrl, redirect: 'always' },
        redirect: 'always',
      })

      // We only get here when the SDK chose not to redirect (a validation
      // problem, or an immediate decline).
      if (result?.error) {
        setError(
          result.error.message || 'That payment did not go through. Try another card.',
        )
        setConfirming(false)
        return
      }

      navigate(`/confirmation?order_id=${encodeURIComponent(orderId)}`, { replace: true })
    } catch (confirmError) {
      console.error('[payment] confirmPayment threw', confirmError)
      setError(confirmError.message || 'Something interrupted the payment. Please try again.')
      setConfirming(false)
    }
  }, [confirming, navigate, orderId])

  if (!clientSecret) return <MissingSecret />

  return (
    <FlowLayout step={1}>
      <div className="flow-grid">
        <section className="flow-main">
          <span className="eyebrow">Last step</span>
          <h1 className="flow-title">
            Seal the <em>deal.</em>
          </h1>
          <p className="flow-lede">
            Pick how you would like to pay. Your card details go straight to our payment processor —
            they never pass through our servers.
          </p>

          {error && (
            <div className="notice notice--error" role="alert">
              {error}
            </div>
          )}

          <div className="pay-panel">
            {!ready && !error && (
              <div className="pay-loading">
                <span className="spinner" aria-hidden="true" />
                <span>Warming up the payment form…</span>
              </div>
            )}
            {/* The SDK renders its cross-origin iframes into this node. */}
            <div id={MOUNT_ID} className="pay-mount" />
          </div>

          <button
            type="button"
            className="btn btn-primary lg btn-block"
            onClick={onPay}
            disabled={!ready || confirming}
          >
            {confirming ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Taking payment…
              </>
            ) : (
              `Pay ${formatMoney(PLAN.amountCents)}`
            )}
          </button>

          <p className="form-fine">
            <LockIcon /> Secured by Hyperswitch. We store no card data, and this prototype takes a
            single {formatMoney(PLAN.amountCents)} charge — no recurring billing is set up.
          </p>
        </section>

        <OrderSummary>
          <Link to="/checkout" className="summary-back">
            ← Edit your details
          </Link>
        </OrderSummary>
      </div>
    </FlowLayout>
  )
}

/** Someone deep-linked to /payment, or their session expired. */
function MissingSecret() {
  return (
    <FlowLayout step={1}>
      <section className="flow-empty">
        <h1 className="flow-title">
          This payment has gone <em>cold.</em>
        </h1>
        <p className="flow-lede">
          We could not find a payment in progress for this tab. Start again from checkout and it
          will only take a moment.
        </p>
        <Link to="/checkout" className="btn btn-primary lg">
          Back to checkout
        </Link>
      </section>
    </FlowLayout>
  )
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
