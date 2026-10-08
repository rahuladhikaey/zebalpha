import { supabaseA } from '../lib/supabase.js';
import { queryRazorpayPayoutById, queryRazorpayPayoutByReference } from './payoutQueueService.js';
import {
  ACTIVE_STATUSES,
  applyProviderState,
  flagForReconciliation,
  mapProviderStatus
} from './payoutStateService.js';

const FINAL_LEDGER_TYPE = {
  SUCCESS: 'WITHDRAWAL_SUCCESS',
  COMPLETED: 'WITHDRAWAL_SUCCESS',
  FAILED: 'WITHDRAWAL_FAILED',
  CANCELLED: 'WITHDRAWAL_FAILED',
  REVERSED: 'WITHDRAWAL_REVERSED'
};

/**
 * Reconciles ONE withdrawal across:
 *   ZebAlpha withdrawal  <->  Razorpay payout (+status)  <->  webhooks  <->  ZebAlpha ledger
 *
 * Never edits financial records directly. It can only:
 *   (a) apply a provider-confirmed state through the guarded SQL transitions, or
 *   (b) flag the payout RECONCILIATION_REQUIRED and append to the reconciliation history.
 */
export async function reconcilePayout(payoutId, adminInfo = null) {
  try {
    const { data: payout, error: pErr } = await supabaseA
      .from('seller_payout_requests').select('*').eq('id', payoutId).single();

    if (pErr || !payout) return { success: false, error: 'Withdrawal request not found' };

    const source = adminInfo?.id ? 'ADMIN' : 'SYSTEM';
    const triggeredBy = adminInfo?.id ? String(adminInfo.id) : null;
    const previousState = {
      status: payout.status,
      provider_status: payout.provider_status,
      provider_payout_id: payout.provider_payout_id,
      utr_number: payout.utr_number,
      failure_reason: payout.failure_reason,
      reconciliation_flag: payout.reconciliation_flag
    };
    const alreadyKnown = new Set(Array.isArray(payout.reconciliation_issues) ? payout.reconciliation_issues : []);

    // 1. Live provider state
    let rzp = payout.provider_payout_id ? await queryRazorpayPayoutById(payout.provider_payout_id) : null;
    if (!rzp?.found) rzp = await queryRazorpayPayoutByReference(payout.payout_number);

    if (rzp?.lookupFailed) {
      return { success: false, error: `Razorpay lookup failed (${rzp.error}). No records were changed.` };
    }

    const issues = [];
    const ctx = { source, triggeredBy, providerStatus: rzp?.status || null, providerAmount: rzp?.amount ?? null };
    let appliedStatus = null;

    if (!rzp.found) {
      const ageMin = (Date.now() - new Date(payout.created_at).getTime()) / 60000;
      if (['SUCCESS', 'COMPLETED'].includes(payout.status)) {
        issues.push('MISSING_PAYOUT');
      } else if (ACTIVE_STATUSES.includes(payout.status) && ageMin > 120) {
        issues.push('MISSING_PAYOUT');
      }
    } else if (rzp.count > 1) {
      issues.push('DUPLICATE_PAYOUT');
    } else {
      // Apply provider-confirmed state via guarded transitions. It flags amount/reference/transition conflicts itself.
      const outcome = await applyProviderState(payout, rzp, { source, triggeredBy });
      appliedStatus = outcome.status || null;
      if (!outcome.applied && outcome.reason) issues.push(`SEE_FLAG_${outcome.reason}`);
    }

    // 2. Fresh local state after any transition
    const { data: fresh } = await supabaseA.from('seller_payout_requests').select('*').eq('id', payout.id).single();
    const current = fresh || payout;

    // 3. Webhooks
    const entityId = current.provider_payout_id || rzp?.payoutId || null;
    let webhooks = [];
    if (entityId) {
      const { data } = await supabaseA.from('webhook_events')
        .select('event_id, event_type, status, created_at, received_at')
        .eq('entity_id', entityId).order('created_at', { ascending: true });
      webhooks = data || [];
    }
    const providerFinal = rzp?.found && ['SUCCESS', 'FAILED', 'CANCELLED', 'REVERSED'].includes(mapProviderStatus(rzp.status));
    const finalAgeMin = (Date.now() - new Date(current.updated_at).getTime()) / 60000;
    if (providerFinal && webhooks.length === 0 && finalAgeMin > 15) issues.push('WEBHOOK_MISSING');
    if (providerFinal && ACTIVE_STATUSES.includes(payout.status) && webhooks.length === 0) issues.push('WEBHOOK_DELAYED');

    // 4. Ledger
    const { data: ledger } = await supabaseA.from('seller_financial_ledger')
      .select('id, transaction_type, entry_type, amount, status, balance_before, balance_after, created_at')
      .eq('reference_id', payout.payout_number).order('created_at', { ascending: true });
    const expectedType = FINAL_LEDGER_TYPE[current.status];
    if (expectedType && !(ledger || []).some(l => l.transaction_type === expectedType)) {
      issues.push('LEDGER_MISMATCH');
    }

    // 5. Flag anything new (never silently modify)
    const reportable = issues.filter(i => !i.startsWith('SEE_FLAG_'));
    const newIssues = adminInfo?.id ? reportable : reportable.filter(i => !alreadyKnown.has(i));
    if (newIssues.length > 0) {
      await flagForReconciliation(payout.id, newIssues,
        `Reconciliation findings: ${newIssues.join(', ')}`, ctx);
    } else if (issues.length === 0) {
      await supabaseA.rpc('record_reconciliation_check', {
        p_payout_id: payout.id,
        p_provider_status: rzp?.status || null,
        p_provider_amount: rzp?.amount ?? null,
        p_source: source,
        p_triggered_by: triggeredBy,
        p_notes: 'All records in sync'
      });
    }

    const { data: finalRow } = await supabaseA.from('seller_payout_requests').select('*').eq('id', payout.id).single();

    if (adminInfo?.id) {
      await supabaseA.from('admin_audit_logs').insert([{
        admin_id: String(adminInfo.id),
        admin_email: adminInfo.email || null,
        action: 'RECONCILE_PAYOUT',
        target_seller_id: payout.seller_id,
        payout_request_id: payout.id,
        previous_state: previousState,
        new_state: {
          status: finalRow?.status,
          provider_status: finalRow?.provider_status,
          reconciliation_flag: finalRow?.reconciliation_flag,
          issues
        },
        reason: adminInfo.reason || 'Admin-initiated reconciliation',
        ip_address: adminInfo.ip || null,
        user_agent: adminInfo.userAgent || null
      }]);
    }

    return {
      success: true,
      payoutId: payout.id,
      payoutNumber: payout.payout_number,
      previousStatus: payout.status,
      currentStatus: finalRow?.status || current.status,
      appliedProviderState: appliedStatus,
      providerFound: !!rzp?.found,
      providerStatus: rzp?.status || null,
      webhooksCount: webhooks.length,
      ledgerEntriesCount: (ledger || []).length,
      issues
    };
  } catch (err) {
    console.error('[Reconciliation Exception]:', err);
    return { success: false, error: err.message };
  }
}

/** Batch reconciliation for every active or flagged payout */
export async function reconcileAllActivePayouts(adminInfo = null) {
  try {
    const { data: payouts, error } = await supabaseA
      .from('seller_payout_requests')
      .select('id, payout_number, status')
      .or(`status.in.(${ACTIVE_STATUSES.join(',')}),reconciliation_flag.eq.true`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !payouts) return { success: false, error: error?.message || 'Failed to fetch payouts' };

    const results = [];
    for (const p of payouts) results.push(await reconcilePayout(p.id, adminInfo));

    return { success: true, totalChecked: payouts.length, results };
  } catch (err) {
    console.error('[Reconcile All Exception]:', err);
    return { success: false, error: err.message };
  }
}
