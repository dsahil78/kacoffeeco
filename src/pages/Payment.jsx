import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FlowLayout, OrderSummary } from '../components/FlowLayout.jsx'
import { PaymentSkeleton } from '../components/PaymentSkeleton.jsx'
import { getHyper, unifiedCheckoutOptions } from '../lib/hyperswitch.js'
import { recallCheckout } from '../lib/session.js'
import { PLAN, formatMoney } from '../lib/plan.js'

const MOUNT_ID = 'unified-checkout'

/**
 * The widget's own painted height, measured from the live sandbox. It is
 * ~432px at every viewport — only the stage's padding around it differs, so we
 * reserve this plus whatever padding the current breakpoint applies rather than
 * hard-coding a total. A fixed total is what left visible dead space under the
 * form when disabling the save-card checkbox made the widget shorter.
 */
const DEFAULT_WIDGET_HEIGHT = 432
const MOBILE_WIDGET_HEIGHT = 610

/** Cache key so a second checkout in the same tab reserves the exact height. */
const WIDGET_HEIGHT_KEY = 'kacc.widgetHeight'

function cachedWidgetHeight() {
  try {
    const v = Number(sessionStorage.getItem(WIDGET_HEIGHT_KEY))
    return Number.isFinite(v) && v > 200 && v < 1200 ? v : DEFAULT_WIDGET_HEIGHT
  } catch {
    return DEFAULT_WIDGET_HEIGHT
  }
}

/**
 * If the SDK's `ready` event never arrives we still have to hand over — the
 * widget is usually interactive by then, and an overlay that never lifts would
 * be worse than one that lifts early.
 */
const READY_TIMEOUT_MS = 12000

/** Below this the widget has not actually painted, whatever the SDK claims. */
const MIN_PAINTED_HEIGHT = 100

export default function Payment() {
  const navigate = useNavigate()
  const location = useLocation()

  // Router state on the happy path; sessionStorage after a refresh.
  const handoff = location.state?.clientSecret ? location.state : recallCheckout()
  const clientSecret = handoff?.clientSecret ?? null
  const orderId = handoff?.orderId ?? null
  const email = handoff?.email ?? null
  const shipping = handoff?.shipping ?? null

  // Two separate signals. `readySignal` is the SDK telling us it is done;
  // `mountHeight` is proof it actually painted something. Unified Checkout only
  // lays out once its mount enters the viewport, so on a phone the signal can
  // arrive while the iframe is still collapsed at 9px. Revealing on the signal
  // alone would swap a polished skeleton for an empty box.
  const [readySignal, setReadySignal] = useState(false)
  const [mountHeight, setMountHeight] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState(null)
  // The stage's own vertical padding, read from the DOM so the reservation
  // tracks the breakpoint instead of assuming one value.
  const [stagePadding, setStagePadding] = useState(32)

  // Imperative SDK handles live in refs — putting them in state would re-render
  // the page every time the widget re-initialises.
  const hyperRef = useRef(null)
  const widgetsRef = useRef(null)
  const mountRef = useRef(null)
  const stageRef = useRef(null)

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
          if (!cancelled) setReadySignal(true)
        })

        unifiedCheckout.mount(`#${MOUNT_ID}`)

        hyperRef.current = hyper
        widgetsRef.current = widgets
        element = unifiedCheckout

        timeout = setTimeout(() => {
          if (!cancelled) setReadySignal(true)
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
      setReadySignal(false)
      setMountHeight(0)
    }
  }, [clientSecret])

  // Track the widget's real height and ease the reserved space to match, so the
  // container neither jumps nor strands empty space under a short form.
  useLayoutEffect(() => {
    const node = mountRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined

    const readPadding = () => {
      const stage = stageRef.current
      if (!stage) return
      const cs = getComputedStyle(stage)
      setStagePadding(parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom))
    }
    readPadding()

    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.contentRect?.height ?? 0
      setMountHeight(height)
      readPadding()
      // Remember what the widget actually needed, so the next checkout in this
      // tab reserves precisely and never shifts at all.
      if (height > MIN_PAINTED_HEIGHT) {
        try {
          sessionStorage.setItem(WIDGET_HEIGHT_KEY, String(Math.round(height)))
        } catch {
          /* private browsing — the default reservation is fine */
        }
      }
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

  // Only hand over when the SDK has reported in *and* the widget has real
  // height. MIN_PAINTED_HEIGHT is well under the ~432px a rendered form
  // occupies, but well over the 9px of a collapsed one.
  const ready = readySignal && mountHeight > MIN_PAINTED_HEIGHT

  // Before the widget paints, hold open the height it is expected to need.
  // Once it has painted, match its real height exactly — no dead space below
  // the form, and no movement because the two values agree.
  const isNarrow =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  const expectedWidgetHeight = isNarrow
    ? Math.min(cachedWidgetHeight(), MOBILE_WIDGET_HEIGHT)
    : cachedWidgetHeight()
  const paintedWidgetHeight = isNarrow
    ? Math.min(mountHeight, MOBILE_WIDGET_HEIGHT)
    : mountHeight
  const stageMinHeight = (ready ? paintedWidgetHeight : expectedWidgetHeight) + stagePadding

  if (!clientSecret) return <MissingSecret />

  return (
    <FlowLayout step={1}>
      <div className="flow-grid flow-grid--summary-first">
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

          <div
            ref={stageRef}
            className={`pay-stage${ready ? ' is-ready' : ''}`}
            style={{ minHeight: stageMinHeight }}
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

        <OrderSummary compact>
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
