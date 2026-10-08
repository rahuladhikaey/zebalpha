import crypto from 'crypto';
import { supabaseA } from '../lib/supabase.js';
import { config } from '../config/index.js';
import { applyProviderState, mapProviderStatus, normalizeProviderPayout } from './payoutStateService.js';

/**
 * Razorpay webhook pipeline:
 *   HTTP -> verify HMAC over RAW body -> store event once (unique event_id) -> 200 OK
 *        -> webhook worker (claim w/ SKIP LOCKED) -> guarded financial transition -> ledger/balance
 * The HTTP request never waits for financial processing and a duplicate event can never be applied twice.
 */

export function verifyWebhookSignature(rawBody, signature) {
  const secret = config.razorpay.webhookSecret;
  if (!secret || !signature || !rawBody) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function entityIdOf(payload) {
  return payload?.payout?.entity?.id || payload?.payment?.entity?.id || payload?.refund?.entity?.id || null;
}

/**
 * Stores a verified event. Returns { duplicate } - the same event id can only ever be stored once.
 */
export async function storeWebhookEvent({ rawBody, signature, body, eventIdHeader }) {
  const eventId = eventIdHeader || `sha256_${crypto.createHash('sha256').update(rawBody).digest('hex')}`;

  const { data, error } = await supabaseA.rpc('record_webhook_event', {
    p_event_id: eventId,
    p_event_type: body?.event || 'unknown',
    p_entity_id: entityIdOf(body?.payload),
    p_payload: body || {},
    p_signature: String(signature)
  });

  if (error) throw new Error(`record_webhook_event failed: ${error.message}`);
  return { eventId, duplicate: data?.is_new === false, status: data?.status };
}

// ------------------------------------------------------------------------------
// Processing
// ------------------------------------------------------------------------------
async function findPayout(entity) {
  if (entity.reference_id) {
    const { data } = await supabaseA.from('seller_payout_requests').select('*')
      .eq('payout_number', entity.reference_id).maybeSingle();
    if (data) return data;
  }
  if (entity.id) {
    const { data } = await supabaseA.from('seller_payout_requests').select('*')
      .eq('provider_payout_id', entity.id).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function processPayoutEvent(row) {
  const entity = row.payload?.payload?.payout?.entity;
  if (!entity) return { status: 'IGNORED', note: 'No payout entity' };

  const payout = await findPayout(entity);
  if (!payout) {
    const ref = String(entity.reference_id || '');
    if (!/^(WTH|AUT)-/.test(ref)) return { status: 'IGNORED', note: 'Not a ZebAlpha seller payout' };
    // Our own reference but no row (yet): throw so the worker retries; stays visible as FAILED
    throw new Error(`Payout ${ref} not found locally`);
  }

  // The signed entity status is authoritative (not the event name)
  const provider = normalizeProviderPayout(entity);
  const mapped = mapProviderStatus(provider.status);

  // Out-of-order delivery guard: a stale earlier-lifecycle event must never override a later state
  if (payout.status === 'REVERSED' && ['PROCESSING', 'SUCCESS'].includes(mapped)) {
    return { status: 'IGNORED', note: 'Stale event after reversal' };
  }
  if (['SUCCESS', 'COMPLETED'].includes(payout.status) && mapped === 'PROCESSING') {
    return { status: 'IGNORED', note: 'Stale processing event after success' };
  }

  const outcome = await applyProviderState(payout, provider, { source: 'WEBHOOK' });
  await supabaseA.rpc('log_payout_event', {
    p_payout_id: payout.id,
    p_type: 'WEBHOOK_RECEIVED',
    p_from: payout.status,
    p_to: payout.status,
    p_source: 'WEBHOOK',
    p_details: { event_id: row.event_id, event_type: row.event_type, provider_status: provider.status, applied: outcome.applied }
  });
  return { status: 'PROCESSED' };
}

async function processCommerceEvent(row) {
  const { event, payload } = row.payload || {};

  if (event === 'refund.processed' && payload?.refund?.entity) {
    const refund = payload.refund.entity;
    const orderId = refund.notes?.order_id || refund.notes?.orderId;
    const refundAmount = Number(refund.amount || 0) / 100;

    let q = supabaseA.from('orders').update({
      refund_status: 'COMPLETED',
      razorpay_refund_id: refund.id,
      refund_amount: refundAmount,
      refund_completed_at: new Date().toISOString()
    });
    q = orderId ? q.eq('id', orderId) : q.eq('payment_id', refund.payment_id);
    await q;

    if (orderId) {
      await supabaseA.from('order_returns')
        .update({ status: 'REFUNDED', refund_id: refund.id, refund_amount: refundAmount, updated_at: new Date().toISOString() })
        .eq('order_id', orderId);
    }
    return { status: 'PROCESSED' };
  }

  if (event === 'refund.failed' && payload?.refund?.entity) {
    const refund = payload.refund.entity;
    const orderId = refund.notes?.order_id || refund.notes?.orderId;
    let q = supabaseA.from('orders').update({ refund_status: 'FAILED' });
    q = orderId ? q.eq('id', orderId) : q.eq('payment_id', refund.payment_id);
    await q;
    return { status: 'PROCESSED' };
  }

  if (event === 'payment.captured' && payload?.payment?.entity) {
    const payment = payload.payment.entity;
    const orderId = payment.notes?.order_id || payment.notes?.orderId;
    if (orderId) {
      await supabaseA.from('orders').update({ payment_status: 'COMPLETE', payment_id: payment.id }).eq('id', orderId);
    }
    return { status: 'PROCESSED' };
  }

  return { status: 'IGNORED', note: `Unhandled event ${event}` };
}

async function processEvent(row) {
  const type = String(row.event_type || '');
  return type.startsWith('payout.') ? processPayoutEvent(row) : processCommerceEvent(row);
}

let draining = false;

/** Webhook worker: claims events atomically and processes each exactly once. */
export async function drainWebhookQueue(limit = 20) {
  if (draining) return { skipped: true }; // per-process re-entrancy guard (DB claim guards across processes)
  draining = true;
  let processed = 0;
  try {
    for (let round = 0; round < 10; round++) {
      const { data: rows, error } = await supabaseA.rpc('claim_webhook_events', { p_limit: limit });
      if (error) { console.error('[Webhook Worker] claim failed:', error.message); break; }
      if (!rows || rows.length === 0) break;

      for (const row of rows) {
        try {
          const result = await processEvent(row);
          await supabaseA.rpc('complete_webhook_event', {
            p_id: row.id,
            p_status: result.status,
            p_error: result.note || null
          });
        } catch (err) {
          console.error(`[Webhook Worker] Event ${row.event_id} failed:`, err.message);
          await supabaseA.rpc('complete_webhook_event', { p_id: row.id, p_status: 'FAILED', p_error: err.message });
        }
        processed++;
      }
      if (rows.length < limit) break;
    }
    return { processed };
  } finally {
    draining = false;
  }
}
