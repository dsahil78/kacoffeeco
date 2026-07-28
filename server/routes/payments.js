import { Router } from 'express'
import { config, PLAN, assertConfigured } from '../config.js'
import { supabase, unwrap } from '../services/supabase.js'
import * as hyperswitch from '../services/hyperswitch.js'
import { verifyRedirectSignature } from '../lib/verifySignature.js'
import {
  getOrderById,
  reconcileOrderWithHyperswitch,
  serializeOrder,
} from '../lib/orders.js'

export const payments = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const COUNTRY_RE = /^[A-Z]{2}$/
const US_ZIP_RE = /^\d{5}(-\d{4})?$/

/** Trims a value to a string, capped so we never hand Hyperswitch a novel. */
function str(value, max = 255) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function validateCheckout(body) {
  const errors = {}

  const email = str(body?.email, 254).toLowerCase()
  if (!email) errors.email = 'Enter your email.'
  else if (!EMAIL_RE.test(email)) errors.email = 'That email address does not look right.'

  const s = body?.shipping ?? {}
  const shipping = {
    firstName: str(s.firstName, 64),
    lastName: str(s.lastName, 64),
    line1: str(s.line1, 128),
    line2: str(s.line2, 128),
    city: str(s.city, 64),
    state: str(s.state, 64),
    zip: str(s.zip, 16),
    country: str(s.country, 2).toUpperCase() || 'US',
  }

  if (!shipping.firstName) errors.firstName = 'Enter a first name.'
  if (!shipping.lastName) errors.lastName = 'Enter a last name.'
  if (!shipping.line1) errors.line1 = 'Enter a street address.'
  if (!shipping.city) errors.city = 'Enter a city.'
  if (!shipping.state) errors.state = 'Enter a state.'
  if (!shipping.zip) errors.zip = 'Enter a ZIP code.'
  else if (shipping.country === 'US' && !US_ZIP_RE.test(shipping.zip))
    errors.zip = 'Enter a valid US ZIP code.'
  if (!COUNTRY_RE.test(shipping.country)) errors.country = 'Enter a two-letter country code.'

  return { email, shipping, errors }
}

/**
 * Finds or creates the customer for this email, in Supabase and in Hyperswitch.
 * Guest checkout means email is the identity, so a repeat shopper reuses their
 * Hyperswitch customer rather than accumulating duplicates.
 */
async function upsertCustomer({ email, shipping }) {
  const db = supabase()
  const fullName = `${shipping.firstName} ${shipping.lastName}`.trim()
  const shippingAddress = { ...shipping }

  const existing = unwrap(
    await db.from('customers').select('*').eq('email', email).maybeSingle(),
    'look up customer',
  )

  if (existing?.hyperswitch_customer_id) {
    // Keep the latest shipping details on file for the next visit.
    return unwrap(
      await db
        .from('customers')
        .update({ full_name: fullName, shipping_address: shippingAddress })
        .eq('id', existing.id)
        .select()
        .single(),
      'update customer',
    )
  }

  const hyperswitchCustomerId = await hyperswitch.createCustomer({ email, fullName })

  // onConflict on email makes two simultaneous first-time checkouts converge on
  // one row instead of one of them exploding on the unique index.
  return unwrap(
    await db
      .from('customers')
      .upsert(
        {
          email,
          full_name: fullName,
          shipping_address: shippingAddress,
          hyperswitch_customer_id: hyperswitchCustomerId,
        },
        { onConflict: 'email' },
      )
      .select()
      .single(),
    'create customer',
  )
}

/**
 * POST /api/payments
 * Creates the customer, persists an order, creates the Hyperswitch payment, and
 * returns *only* the client_secret and identifiers the browser needs.
 */
payments.post('/payments', async (req, res, next) => {
  try {
    assertConfigured()

    const { email, shipping, errors } = validateCheckout(req.body)
    if (Object.keys(errors).length) {
      return res.status(422).json({ error: 'Please fix the highlighted fields.', fields: errors })
    }

    const customer = await upsertCustomer({ email, shipping })

    const order = unwrap(
      await supabase()
        .from('orders')
        .insert({
          customer_id: customer.id,
          plan: PLAN.id,
          amount_cents: PLAN.amountCents,
          currency: PLAN.currency,
          status: 'created',
        })
        .select()
        .single(),
      'create order',
    )

    const returnUrl = `${config.appBaseUrl}/confirmation?order_id=${order.id}`

    let payment
    try {
      payment = await hyperswitch.createPayment({
        orderId: order.id,
        customerId: customer.hyperswitch_customer_id,
        email,
        shipping,
        returnUrl,
      })
    } catch (error) {
      await supabase().from('orders').update({ status: 'failed' }).eq('id', order.id)
      throw error
    }

    unwrap(
      await supabase()
        .from('orders')
        .update({ hyperswitch_payment_id: payment.payment_id })
        .eq('id', order.id)
        .select()
        .single(),
      'attach payment to order',
    )

    // client_secret is scoped to this one payment and is safe for the browser.
    // The secret key never appears here.
    res.status(201).json({
      order_id: order.id,
      payment_id: payment.payment_id,
      client_secret: payment.client_secret,
      amount_cents: PLAN.amountCents,
      currency: PLAN.currency,
      return_url: returnUrl,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/orders/:orderId
 * Status straight from our database, reconciled with Hyperswitch if we are
 * still waiting on the webhook.
 */
payments.get('/orders/:orderId', async (req, res, next) => {
  try {
    assertConfigured()

    const order = await getOrderById(req.params.orderId)
    if (!order) return res.status(404).json({ error: 'Order not found.' })

    res.json({ order: serializeOrder(await reconcileOrderWithHyperswitch(order)) })
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/orders/:orderId/confirm
 * Called by the Confirmation page with the query params Hyperswitch appended to
 * the return_url. We verify the HMAC-SHA512 signature before trusting any of
 * it, then answer from the database regardless — the redirect is a UX signal,
 * not an authority on whether money moved.
 */
payments.post('/orders/:orderId/confirm', async (req, res, next) => {
  try {
    assertConfigured()

    const order = await getOrderById(req.params.orderId)
    if (!order) return res.status(404).json({ error: 'Order not found.' })

    const params = req.body?.params ?? {}
    const hasRedirectParams = Boolean(params.signature)
    const verification = hasRedirectParams
      ? verifyRedirectSignature(params)
      : { valid: false, reason: 'no_redirect_params' }

    if (hasRedirectParams && !verification.valid) {
      console.warn('[payments] redirect signature rejected', order.id, verification.reason)
    }

    // Cross-check that a verified redirect actually belongs to this order.
    if (
      verification.valid &&
      params.payment_id &&
      order.hyperswitch_payment_id &&
      params.payment_id !== order.hyperswitch_payment_id
    ) {
      return res.status(400).json({ error: 'This payment does not belong to that order.' })
    }

    res.json({
      order: serializeOrder(await reconcileOrderWithHyperswitch(order)),
      redirect_signature_verified: verification.valid,
    })
  } catch (error) {
    next(error)
  }
})

/** GET /api/plan — the single plan, so the client never hardcodes the price. */
payments.get('/plan', (_req, res) => {
  res.json({
    id: PLAN.id,
    name: PLAN.name,
    amount_cents: PLAN.amountCents,
    currency: PLAN.currency,
  })
})
