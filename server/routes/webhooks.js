import { Router } from 'express'
import express from 'express'
import { assertConfigured } from '../config.js'
import { supabase, unwrap } from '../services/supabase.js'
import { toOrderStatus } from '../services/hyperswitch.js'
import { verifyWebhookSignature } from '../lib/verifySignature.js'
import { advanceOrderStatus, getOrderById, getOrderByPaymentId } from '../lib/orders.js'

export const webhooks = Router()

/**
 * POST /api/webhooks/hyperswitch
 *
 * The source of truth for order status.
 *
 * Body parsing is `express.raw` rather than `express.json` because the
 * signature covers the exact bytes Hyperswitch sent. Parsing and re-serialising
 * would change key order and whitespace, and the HMAC with it.
 *
 * Payload shape (api_models::webhooks::OutgoingWebhook):
 *   { merchant_id, event_id, event_type, timestamp,
 *     content: { type: "payment_details", object: { …PaymentsResponse } } }
 */
webhooks.post(
  '/webhooks/hyperswitch',
  express.raw({ type: '*/*', limit: '1mb' }),
  async (req, res) => {
    try {
      assertConfigured()
    } catch {
      return res.status(503).json({ received: false, error: 'not_configured' })
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : null
    const verification = verifyWebhookSignature(rawBody, req.headers)

    if (!verification.valid) {
      console.warn('[webhook] rejected:', verification.reason)
      return res.status(401).json({ received: false, error: verification.reason })
    }

    let event
    try {
      event = JSON.parse(rawBody.toString('utf8'))
    } catch {
      return res.status(400).json({ received: false, error: 'invalid_json' })
    }

    // Always 200 past this point: the payload is authenticated, so a failure on
    // our side is our problem to fix, and Hyperswitch retrying a poison event
    // forever helps nobody. Failures are logged instead.
    try {
      await processEvent(event)
    } catch (error) {
      console.error('[webhook] processing failed', event?.event_id, error)
    }

    res.status(200).json({ received: true })
  },
)

async function processEvent(event) {
  const eventId = event?.event_id
  const eventType = event?.event_type ?? null

  if (!eventId) {
    console.warn('[webhook] event without event_id, skipping')
    return
  }

  // Idempotency gate. The unique index on event_id means a redelivery loses
  // this insert and returns 23505, at which point we know we have seen it.
  const { error: insertError } = await supabase()
    .from('webhook_events')
    .insert({ event_id: eventId, event_type: eventType, payload: event })

  if (insertError) {
    if (insertError.code === '23505') {
      console.info('[webhook] duplicate event ignored', eventId)
      return
    }
    throw new Error(`record webhook event: ${insertError.message}`)
  }

  const payment = event?.content?.object ?? null
  if (event?.content?.type && event.content.type !== 'payment_details') {
    // Refunds, disputes and mandates are out of scope for this prototype.
    await markProcessed(eventId)
    return
  }

  const order = await findOrder(payment)
  if (!order) {
    console.warn('[webhook] no matching order for event', eventId, payment?.payment_id)
    await markProcessed(eventId)
    return
  }

  const nextStatus = toOrderStatus(payment?.status)
  if (!nextStatus) {
    console.warn('[webhook] unmapped payment status', payment?.status)
    await markProcessed(eventId)
    return
  }

  const updated = await advanceOrderStatus(order, nextStatus)
  console.info(
    `[webhook] ${eventType} ${payment?.payment_id} → order ${order.id} is ${updated.status}`,
  )

  await markProcessed(eventId)
}

/**
 * Resolves the order from the payment. We prefer the metadata we set at
 * creation time and fall back to the payment id, so an event still lands even
 * if metadata was stripped somewhere along the way.
 */
async function findOrder(payment) {
  const orderId = payment?.metadata?.order_id
  if (orderId) {
    const order = await getOrderById(orderId)
    if (order) return order
  }
  if (payment?.payment_id) return getOrderByPaymentId(payment.payment_id)
  return null
}

async function markProcessed(eventId) {
  unwrap(
    await supabase()
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('event_id', eventId),
    'mark webhook processed',
  )
}
