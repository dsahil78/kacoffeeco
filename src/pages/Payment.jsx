import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FlowLayout, OrderSummary } from '../components/FlowLayout.jsx'
import { PaymentSkeleton } from '../components/PaymentSkeleton.jsx'
import { getHyper, unifiedCheckoutOptions } from '../lib/hyperswitch.js'
import { recallCheckout } from '../lib/session.js'
import { PLAN, formatMoney } from '../lib/plan.js'

const MOUNT_ID = 'unified-checkout'

/**
 * Height reserved for the widget before it reports in, so nothing shifts.
 *
 * Measured from the real sandbox widget plus the stage's own padding: 512px on
 * desktop, 499px on mobile. Reserve slightly above the tallest case — the stage
 * only ever grows past this value, so under-reserving costs a layout shift
 * while over-reserving costs a few invisible pixels of padding.
 *
 * Re-measure this if the widget's contents change (different wallets enabled,
 * or an `appearance` theme with different metrics).
 */
const RESERVED_HEIGHT = 516

/**
 * If the SDK's `ready` event never arrives we still have to hand over — the
 * widget is usually interactive by then, and an overlay that never lifts would
 * be worse than one that lifts early.
 */
const READY_TIMEOUT_MS = 12000

export default function Payment() {
  const navigate = useNavigate()
  const location = useLocation()

  // Router state on the happy path; sessionStorage after a refresh.
  const handoff = location.state?.clientSecret ? location.state : recallCheckout()
  const clientSecret = handoff?.clientSecret ?? null
  const orderId = handoff?.orderId ?? null
  const email = handoff?.email ?? null
  const shipping = handoff?.shipping ?? null

  const [ready, setReady] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  const [stageHeight, setStageHeight] = useState(RESERVED_HEIGHT)

  // Imperative SDK handles live in refs — putting them in state would re-render
  // the page every time the widget re-initialises.
  const hyperRef = useRef(null)
  const widgetsRef = useRef(null)
  const mountRef = useRef(null)

  useEffect(() => {
    if (!clientSecret) return undefined

    let cancelled = false
    let element = null
    let timeout = null

    ;(async () => {
      try {
        const hyper = await getHyper()
        if (cancelled) return

        const widgets = hyper.widgets({ clientSecret })
        const unifiedCheckout = widgets.create('payment', unifiedCheckoutOptions)

        // The SDK emits `ready` once its iframes have actually painted. Mount
        // completing is not the same thing — that is why the form used to pop
        // in several seconds after we claimed it was there.
        unifiedCheckout.on?.('ready', () => {
          if (!cancelled) setReady(true)
        })

        unifiedCheckout.mount(`#${MOUNT_ID}`)

        hyperRef.current = hyper
        widgetsRef.current = widgets
        element = unifiedCheckout

        timeout = setTimeout(() => {
          if (!cancelled) setReady(true)
        }, READY_TIMEOUT_MS)
      } catch (mountError) {
        if (cancelled) return
        console.error('[payment] failed to mount Unified Checkout', mountError)
        setError(
          mountError.message ||
            'We could not load the secure payment form. Refresh the page and try again. You have not been charged.',
        )
      }
    })()

    return () => {
      // StrictMode invokes effects twice in development; tearing the widget
      // down here keeps the second mount from stacking a duplicate iframe.
      cancelled = true
      if (timeout) clearTimeout(timeout)
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

  // Track the widget's real height and ease the reserved space to match, so the
  // container neither jumps nor strands empty space under a short form.
  useLayoutEffect(() => {
    const node = mountRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.contentRect?.height ?? 0
      if (height > 0) setStageHeight(Math.max(height, 180))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const onPay = useCallback(async () => {
    if (!hyperRef.current || !widgetsRef.current || confirming) return

    setConfirming(true)
    setError(null)

    const returnUrl = `${window.location.origin}/confirmation?order_id=${encodeURIComponent(orderId)}`

    try {
      // `widgets` and `elements` are the same handle under two names across SDK
      // versions and docs; `redirect` is read from both the top level and
      // confirmParams depending on the flow, so it goes in both places.
      const result = await hyperRef.current.confirmPayment({
        widgets: widgetsRef.current,
        elements: widgetsRef.current,
        confirmParams: { return_url: returnUrl, redirect: 'always' },
        redirect: 'always',
      })

      // We only get here when the SDK chose not to redirect — a validation
      // problem, or an immediate decline.
      if (result?.error) {
        setError(
          result.error.message ||
            'That payment did not go through. Check the card details or try another method. You have not been charged.',
        )
        setConfirming(false)
        return
      }

      navigate(`/confirmation?order_id=${encodeURIComponent(orderId)}`, { replace: true })
    } catch (confirmError) {
      console.error('[payment] confirmPayment threw', confirmError)
      setError(
        confirmError.message ||
          'Something interrupted the payment. Please try again. You have not been charged.',
      )
      setConfirming(false)
    }
  }, [confirming, navigate, orderId])

  if (!clientSecret) return <MissingSecret />

  return (
    <FlowLayout step={1}>
      <div className="flow-grid">
        <section className="flow-main">
          <div className="pay-hero">
            <span className="eyebrow">Secure payment</span>
            <h1 className="flow-title">
              One calm click from <em>coffee.</em>
            </h1>
            <p className="flow-lede">
              Choose a payment method below. Your card details are encrypted by Hyperswitch and
              never touch our servers.
            </p>
          </div>

          {error && (
            <div className="notice notice--error" role="alert">
              <strong>Payment needs a second look.</strong>
              <span>{error}</span>
            </div>
          )}

          <div className="pay-review" aria-label="Review payment details">
            <div className="pay-review-head">
              <span>Review details</span>
              <Link to="/checkout" className="link pay-review-edit">
                Edit
              </Link>
            </div>
            <div className="pay-review-grid">
              <div className="pay-review-item pay-review-item--shipping">
                <span className="pay-review-label">Ship to</span>
                <address className="pay-review-address">{formatShipping(shipping)}</address>
              </div>
              <div className="pay-review-item pay-review-item--contact">
                <span className="pay-review-label">Contact</span>
                <span className="pay-review-value">{email || 'Guest checkout'}</span>
              </div>
            </div>
          </div>

          {/* The stage only ever grows past the reservation, never shrinks back
              to meet a shorter widget. Animating a small shrink looks tidy but
              every frame of it counts as a layout shift, which is precisely the
              thing the reservation exists to prevent — a few pixels of unused
              space is invisible, a settling container is not. */}
          <div
            className={`pay-stage${ready ? ' is-ready' : ''}`}
            style={{ minHeight: Math.max(RESERVED_HEIGHT, ready ? stageHeight : 0) }}
          >
            {!error && (
              <div className="pay-loading">
                {/* Visual only — the single sr-only status below announces both
                    the wait and its end, so a second live region here would
                    make screen readers say the same thing twice. */}
                <div className="pay-loading-card">
                  <span className="spinner" aria-hidden="true" />
                  <div>
                    <p className="pay-loading-title">Preparing secure checkout</p>
                    <p className="pay-loading-copy">
                      You’ll be able to pay in just a moment.
                    </p>
                  </div>
                </div>
                <PaymentSkeleton />
              </div>
            )}
            {/* The SDK renders its cross-origin iframes into this node. */}
            <div id={MOUNT_ID} ref={mountRef} className="pay-mount" />
          </div>

          {/* One polite announcement when the form is usable, for screen readers
              that would otherwise get no signal that the wait ended. */}
          <p className="sr-only" role="status" aria-live="polite">
            {ready ? 'Secure checkout is ready.' : 'Preparing your secure checkout.'}
          </p>

          <button
            type="button"
            className="btn btn-primary lg btn-block pay-cta"
            onClick={onPay}
            disabled={!ready || confirming}
          >
            {confirming ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Taking payment…
              </>
            ) : (
              `Pay ${formatMoney(PLAN.amountCents)} securely`
            )}
          </button>

          <p className="form-fine">
            <LockIcon /> Secured by Hyperswitch. This prototype takes a single{' '}
            {formatMoney(PLAN.amountCents)} charge today — no recurring billing is set up.
          </p>
        </section>

        <OrderSummary>
          <Link to="/checkout" className="link summary-back">
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

function formatShipping(shipping) {
  if (!shipping) return 'Shipping details ready'

  const name = [shipping.firstName, shipping.lastName].filter(Boolean).join(' ')
  const cityLine = [
    [shipping.city, shipping.state].filter(Boolean).join(', '),
    shipping.zip,
  ]
    .filter(Boolean)
    .join(' ')

  return [name, shipping.line1, shipping.line2, cityLine].filter(Boolean).join('\n')
}
