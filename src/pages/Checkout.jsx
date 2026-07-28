import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FlowLayout, OrderSummary } from '../components/FlowLayout.jsx'
import { createPayment, ApiError } from '../lib/api.js'
import { prewarmHyper } from '../lib/hyperswitch.js'
import { PLAN, formatMoney } from '../lib/plan.js'
import { recallCheckout, rememberCheckout } from '../lib/session.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const US_ZIP_RE = /^\d{5}(-\d{4})?$/

const EMPTY = {
  email: '',
  firstName: '',
  lastName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
}

function initialValues() {
  const handoff = recallCheckout()
  const shipping = handoff?.shipping ?? {}

  return {
    ...EMPTY,
    email: handoff?.email ?? '',
    firstName: shipping.firstName ?? '',
    lastName: shipping.lastName ?? '',
    line1: shipping.line1 ?? '',
    line2: shipping.line2 ?? '',
    city: shipping.city ?? '',
    state: shipping.state ?? '',
    zip: shipping.zip ?? '',
    country: shipping.country ?? EMPTY.country,
  }
}

/** Client-side mirror of the server's rules — the server is still the authority. */
function validate(values) {
  const errors = {}
  if (!values.email.trim()) errors.email = 'Enter your email.'
  else if (!EMAIL_RE.test(values.email.trim()))
    errors.email = 'That email address does not look right.'

  if (!values.firstName.trim()) errors.firstName = 'Enter a first name.'
  if (!values.lastName.trim()) errors.lastName = 'Enter a last name.'
  if (!values.line1.trim()) errors.line1 = 'Enter a street address.'
  if (!values.city.trim()) errors.city = 'Enter a city.'
  if (!values.state.trim()) errors.state = 'Enter a state.'
  if (!values.zip.trim()) errors.zip = 'Enter a ZIP code.'
  else if (values.country === 'US' && !US_ZIP_RE.test(values.zip.trim()))
    errors.zip = 'Enter a valid US ZIP code.'
  return errors
}

export default function Checkout() {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Fetch the payment SDK while the shopper fills in their address. By the time
  // they reach /payment the script is parsed and the connection is open, which
  // is most of the difference between the form being there and "loading…".
  useEffect(() => {
    prewarmHyper()
  }, [])

  const set = (name) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear the error as soon as the shopper starts fixing it.
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const blur = (name) => () => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const fieldErrors = validate(values)
    setErrors((prev) => ({ ...prev, [name]: fieldErrors[name] }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setFormError(null)

    const nextErrors = validate(values)
    setErrors(nextErrors)
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((key) => [key, true])))

    if (Object.keys(nextErrors).length) {
      document.querySelector('.field--invalid input')?.focus()
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        email: values.email.trim().toLowerCase(),
        shipping: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          line1: values.line1.trim(),
          line2: values.line2.trim(),
          city: values.city.trim(),
          state: values.state.trim(),
          zip: values.zip.trim(),
          country: values.country,
        },
      }

      const result = await createPayment(payload)

      // Survives a refresh on /payment, where losing the client_secret would
      // otherwise strand the shopper mid-checkout.
      rememberCheckout({
        orderId: result.order_id,
        clientSecret: result.client_secret,
        paymentId: result.payment_id,
        email: payload.email,
        shipping: payload.shipping,
      })

      navigate('/payment', {
        replace: true,
        state: {
          orderId: result.order_id,
          clientSecret: result.client_secret,
          email: payload.email,
          shipping: payload.shipping,
        },
      })
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields)
        document.querySelector('.field--invalid input')?.focus()
      }
      setFormError(error.message)
      setSubmitting(false)
    }
  }

  const field = (name, label, extra = {}) => {
    const invalid = Boolean(touched[name] && errors[name])
    return (
      <div className={`field${invalid ? ' field--invalid' : ''}`}>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          value={values[name]}
          onChange={set(name)}
          onBlur={blur(name)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${name}-error` : undefined}
          disabled={submitting}
          {...extra}
        />
        {invalid && (
          <span className="field-error" id={`${name}-error`} role="alert">
            {errors[name]}
          </span>
        )}
      </div>
    )
  }

  return (
    <FlowLayout step={0}>
      <div className="flow-grid flow-grid--summary-first">
        <section className="flow-main">
          <span className="eyebrow">Almost there</span>
          <h1 className="flow-title">
            Where should the <em>good stuff</em> go?
          </h1>
          <p className="flow-lede">
            No account, no password to forget. Give us an email for the shipping updates and an
            address for the beans.
          </p>

          {formError && (
            <div className="notice notice--error" role="alert">
              {formError}
            </div>
          )}

          <form className="checkout-form" onSubmit={onSubmit} noValidate>
            <fieldset>
              <legend>Contact</legend>
              {field('email', 'Email', {
                type: 'email',
                autoComplete: 'email',
                placeholder: 'you@example.com',
                inputMode: 'email',
              })}
              <p className="form-hint">
                Order confirmation and tracking land here. That is all we use it for.
              </p>
            </fieldset>

            <fieldset>
              <legend>Shipping address</legend>
              <div className="field-row">
                {field('firstName', 'First name', { autoComplete: 'given-name' })}
                {field('lastName', 'Last name', { autoComplete: 'family-name' })}
              </div>
              {field('line1', 'Street address', {
                autoComplete: 'address-line1',
                placeholder: '123 Roast Row',
              })}
              {field('line2', 'Apartment, suite (optional)', { autoComplete: 'address-line2' })}
              <div className="field-row field-row--thirds">
                {field('city', 'City', { autoComplete: 'address-level2' })}
                {field('state', 'State', { autoComplete: 'address-level1', placeholder: 'CA' })}
                {field('zip', 'ZIP', {
                  autoComplete: 'postal-code',
                  inputMode: 'numeric',
                  placeholder: '94110',
                })}
              </div>
              <div className="field">
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  name="country"
                  value={values.country}
                  onChange={set('country')}
                  disabled={submitting}
                >
                  <option value="US">United States</option>
                </select>
                <span className="form-hint">We only ship within the US for now.</span>
              </div>
            </fieldset>

            <button type="submit" className="btn btn-primary lg btn-block" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Setting up your payment…
                </>
              ) : (
                `Continue to payment — ${formatMoney(PLAN.amountCents)}`
              )}
            </button>

            <p className="form-fine">
              Card details are collected by Hyperswitch on the next step. They never touch our
              servers.
            </p>
          </form>
        </section>

        <OrderSummary>
          <Link to="/" className="summary-back">
            ← Back to the roast
          </Link>
        </OrderSummary>
      </div>
    </FlowLayout>
  )
}
