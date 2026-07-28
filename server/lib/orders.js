import { supabase, unwrap } from '../services/supabase.js'
import { retrievePayment, toOrderStatus } from '../services/hyperswitch.js'

/**
 * Order status is a one-way ratchet. Webhook deliveries are not ordered, and a
 * `processing` event can easily land after the `succeeded` event it preceded,
 * so we only ever move a row *up* this ladder.
 *
 * `failed` sits below `succeeded` on purpose: Hyperswitch allows a retry on the
 * same payment intent (`manual_retry_allowed`), so failed → succeeded is a real
 * transition. succeeded → failed is not.
 */
const RANK = { created: 0, processing: 1, failed: 2, succeeded: 3 }

export function isTerminal(status) {
  return status === 'succeeded' || status === 'failed'
}

/**
 * Advances an order's status, ignoring regressions. Returns the current row.
 */
export async function advanceOrderStatus(order, nextStatus) {
  if (!nextStatus || !(nextStatus in RANK)) return order
  if (RANK[nextStatus] <= RANK[order.status]) return order

  const updated = unwrap(
    await supabase()
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)
      // Re-check the rank in the WHERE clause so two concurrent webhook
      // deliveries can't clobber each other between our read and this write.
      .in(
        'status',
        Object.keys(RANK).filter((s) => RANK[s] < RANK[nextStatus]),
      )
      // Re-select the customer relation: without it the updated row comes back
      // without `customers`, and the Confirmation page loses the email it uses
      // for "your confirmation is on its way to …".
      .select('*, customers ( email, full_name )')
      .maybeSingle(),
    'update order status',
  )

  return updated ?? order
}

export async function getOrderById(orderId) {
  return unwrap(
    await supabase()
      .from('orders')
      .select('*, customers ( email, full_name )')
      .eq('id', orderId)
      .maybeSingle(),
    'load order',
  )
}

export async function getOrderByPaymentId(paymentId) {
  return unwrap(
    await supabase()
      .from('orders')
      .select('*')
      .eq('hyperswitch_payment_id', paymentId)
      .maybeSingle(),
    'load order by payment id',
  )
}

/**
 * Pulls the payment state from Hyperswitch and folds it into the order.
 *
 * The webhook remains the source of truth for this prototype; this exists
 * because a webhook cannot reach `http://localhost:5173`, so without it the
 * Confirmation page would sit on `processing` forever in local development.
 * It is also a genuine safety net in production for a dropped delivery.
 */
export async function reconcileOrderWithHyperswitch(order) {
  if (!order?.hyperswitch_payment_id || isTerminal(order.status)) return order

  try {
    // force_sync is deliberately off: it makes Hyperswitch re-query the
    // connector, which regularly takes several seconds and would leave the
    // Confirmation page spinning. The stored intent status is Hyperswitch's own
    // record and is already updated by the time the shopper is redirected back.
    const payment = await retrievePayment(order.hyperswitch_payment_id, { forceSync: false })
    return await advanceOrderStatus(order, toOrderStatus(payment.status))
  } catch (error) {
    // A reconcile failure must not break the Confirmation page — the shopper
    // still gets the last status we durably recorded.
    console.error('[orders] reconcile failed', order.id, error.message)
    return order
  }
}

/** Masks an email for display: sahil@example.com → s•••l@example.com */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return null
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}•••@${domain}`
  return `${local[0]}•••${local[local.length - 1]}@${domain}`
}

/**
 * The only shape of an order that is ever sent to a browser. Deliberately
 * excludes anything that would let a caller act on the payment.
 */
export function serializeOrder(order) {
  return {
    id: order.id,
    plan: order.plan,
    amount_cents: order.amount_cents,
    currency: order.currency,
    status: order.status,
    email: maskEmail(order.customers?.email),
    created_at: order.created_at,
    updated_at: order.updated_at,
  }
}
