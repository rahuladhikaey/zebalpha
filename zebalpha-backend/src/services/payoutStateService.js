import { supabaseA } from '../lib/supabase.js';

/**
 * Single choke-point for turning a VERIFIED Razorpay payout state into a ZebAlpha financial transition.
 * Used by: queue worker, webhook worker, stuck-payout detector, admin/system reconciliation.
 *
 * Guarantees:
 *  - SUCCESS is only ever applied from a provider-sourced status (API response, signed webhook, or live API query)
 *  - provider amount / reference / payout-id must match the local record, otherwise NOTHING moves and the
 *    payout is flagged RECONCILIATION_REQUIRED
 *  - the actual state change is performed by a transition-guarded, idempotent SQL function
 */

export const ACTIVE_STATUSES = ['PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED'];

export function mapProviderStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'queued':
    case 'pending':
    case 'processing':
    case 'scheduled':
    case 'initiated':
      return 'PROCESSING';
    case 'processed':
      return 'SUCCESS';
    case 'failed':
    case 'rejected':
      return 'FAILED';
    case 'cancelled':
    case 'canceled':
      return 'CANCELLED';
    case 'reversed':
      return 'REVERSED';
    default:
      return 'UNKNOWN';
  }
}

export function normalizeProviderPayout(item) {
  if (!item) return null;
  return {
    payoutId: item.id,
    referenceId: item.reference_id || null,
    status: item.status,
    utr: item.utr || null,
    failureReason: item.failure_reason || item.status_details?.description || null,
    amount: Number(((item.amount || 0) / 100).toFixed(2))
  };
}

async function rpc(name, args) {
  const { data, error } = await supabaseA.rpc(name, args);
  if (error) {
    const err = new Error(`${name} failed: ${error.message}`);
    err.cause = error;
    throw err;
  }
  return data;
}

export async function flagForReconciliation(payoutId, issueTypes, notes, { source = 'SYSTEM', providerStatus = null, providerAmount = null, triggeredBy = null } = {}) {
  return rpc('flag_payout_reconciliation', {
    p_payout_id: payoutId,
    p_issue_types: issueTypes,
    p_notes: notes,
    p_source: source,
    p_provider_status: providerStatus,
    p_provider_amount: providerAmount,
    p_triggered_by: triggeredBy
  });
}

/**
 * @param payout   row from seller_payout_requests
 * @param provider normalized provider payout ({payoutId, referenceId, status, utr, failureReason, amount})
 * @param opts     { source: 'WORKER'|'WEBHOOK'|'RECONCILIATION'|'STUCK_DETECTOR', triggeredBy }
 */
export async function applyProviderState(payout, provider, { source = 'SYSTEM', triggeredBy = null } = {}) {
  const ctx = { source, providerStatus: provider.status, providerAmount: provider.amount, triggeredBy };

  // 1. Identity checks - never apply a state that might belong to another payout
  if (provider.referenceId && provider.referenceId !== payout.payout_number) {
    await flagForReconciliation(payout.id, ['REFERENCE_MISMATCH'],
      `Provider reference ${provider.referenceId} does not match ${payout.payout_number}`, ctx);
    return { applied: false, reason: 'REFERENCE_MISMATCH' };
  }

  if (payout.provider_payout_id && provider.payoutId && payout.provider_payout_id !== provider.payoutId) {
    await flagForReconciliation(payout.id, ['DUPLICATE_PAYOUT'],
      `Local provider payout ${payout.provider_payout_id} differs from provider payout ${provider.payoutId} for the same reference`, ctx);
    return { applied: false, reason: 'DUPLICATE_PAYOUT' };
  }

  // 2. Amount check
  if (Number(provider.amount).toFixed(2) !== Number(payout.amount).toFixed(2)) {
    await flagForReconciliation(payout.id, ['AMOUNT_MISMATCH'],
      `Amount mismatch: ZebAlpha=INR ${Number(payout.amount).toFixed(2)}, Razorpay=INR ${Number(provider.amount).toFixed(2)}`, ctx);
    return { applied: false, reason: 'AMOUNT_MISMATCH' };
  }

  // 3. Apply via guarded SQL transitions
  const mapped = mapProviderStatus(provider.status);
  let result;

  switch (mapped) {
    case 'PROCESSING':
      result = await rpc('mark_payout_dispatched', {
        p_payout_id: payout.id,
        p_provider_payout_id: provider.payoutId,
        p_provider_status: provider.status,
        p_utr: provider.utr,
        p_source: source
      });
      break;
    case 'SUCCESS':
      result = await rpc('finalize_payout_success', {
        p_payout_id: payout.id,
        p_provider_payout_id: provider.payoutId,
        p_utr_number: provider.utr,
        p_source: source
      });
      break;
    case 'FAILED':
    case 'CANCELLED':
      result = await rpc('finalize_payout_failure', {
        p_payout_id: payout.id,
        p_failure_reason: provider.failureReason || `Provider status: ${provider.status}`,
        p_final_status: mapped,
        p_source: source
      });
      break;
    case 'REVERSED':
      result = await rpc('finalize_payout_reversal', {
        p_payout_id: payout.id,
        p_reason: provider.failureReason || 'Provider reversed payout',
        p_source: source
      });
      break;
    default:
      await flagForReconciliation(payout.id, ['UNKNOWN_PROVIDER_STATUS'],
        `Unrecognised Razorpay payout status "${provider.status}"`, ctx);
      return { applied: false, reason: 'UNKNOWN_PROVIDER_STATUS' };
  }

  return { applied: result?.success !== false, status: mapped, result };
}
