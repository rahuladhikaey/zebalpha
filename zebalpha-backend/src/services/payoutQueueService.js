import crypto from 'crypto';
import { supabaseA } from '../lib/supabase.js';
import { config } from '../config/index.js';
import {
  ACTIVE_STATUSES,
  applyProviderState,
  flagForReconciliation,
  normalizeProviderPayout
} from './payoutStateService.js';

const RZP_BASE = 'https://api.razorpay.com/v1';
const WORKER_ID = `worker_${process.env.RENDER_INSTANCE_ID || process.pid || 'main'}_${crypto.randomBytes(3).toString('hex')}`;

function assertConfigured() {
  const { keyId, keySecret, accountNumber } = config.razorpay;
  if (!keyId || !keySecret || !accountNumber) {
    const err = new Error('Razorpay payout credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_ACCOUNT_NUMBER) are not configured');
    err.isConfigError = true;
    throw err;
  }
}

function authHeader() {
  return 'Basic ' + Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
}

/** Razorpay allows max 36 chars for X-Payout-Idempotency. Deterministic per payout. */
function providerIdempotencyKey(payoutNumber) {
  return crypto.createHash('sha256').update(String(payoutNumber)).digest('hex').slice(0, 32);
}

/**
 * Low-level request. Resolves with { status, data } for ANY http response.
 * Rejects with err.isNetwork = true for timeouts / connection failures (outcome UNKNOWN).
 */
async function rzp(method, path, { body, headers = {}, timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || config.payouts.requestTimeoutMs);
  try {
    const res = await fetch(`${RZP_BASE}${path}`, {
      method,
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (err) {
    err.isNetwork = true;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Looks up payouts at Razorpay by our reference (payout_number).
 * { found, count, items, ...first item } on success;  { found:false, lookupFailed:true, error } when UNKNOWN.
 * IMPORTANT: lookupFailed means "we do not know" - callers must NOT treat it as "not found".
 */
export async function queryRazorpayPayoutByReference(referenceId) {
  try {
    assertConfigured();
    const qs = new URLSearchParams({
      account_number: config.razorpay.accountNumber,
      reference_id: referenceId
    });
    const { status, data } = await rzp('GET', `/payouts?${qs.toString()}`);
    if (status < 200 || status >= 300) {
      return { found: false, lookupFailed: true, error: `HTTP ${status}` };
    }
    const items = (Array.isArray(data.items) ? data.items : []).filter(i => i.reference_id === referenceId);
    if (items.length === 0) return { found: false, count: 0 };
    const normalized = items.map(normalizeProviderPayout);
    return { found: true, count: normalized.length, items: normalized, ...normalized[0] };
  } catch (err) {
    console.error('[Razorpay Query By Reference Exception]:', err.message);
    return { found: false, lookupFailed: true, error: err.message };
  }
}

export async function queryRazorpayPayoutById(payoutId) {
  try {
    assertConfigured();
    const { status, data } = await rzp('GET', `/payouts/${encodeURIComponent(payoutId)}`);
    if (status === 404) return { found: false, count: 0 };
    if (status < 200 || status >= 300) {
      return { found: false, lookupFailed: true, error: `HTTP ${status}` };
    }
    const n = normalizeProviderPayout(data);
    return { found: true, count: 1, items: [n], ...n };
  } catch (err) {
    console.error('[Razorpay Query By ID Exception]:', err.message);
    return { found: false, lookupFailed: true, error: err.message };
  }
}

// ------------------------------------------------------------------------------
// Job helpers
// ------------------------------------------------------------------------------
async function requeue(job, seconds, message) {
  await supabaseA.rpc('requeue_payout_job', { p_job_id: job.id, p_delay_seconds: seconds, p_error: message });
}

async function deadLetter(job, message) {
  await supabaseA.from('payout_queue')
    .update({ status: 'DEAD_LETTER', error_message: message, updated_at: new Date().toISOString() })
    .eq('id', job.id);
}

function backoffSeconds(attempt) {
  return Math.min(900, Math.pow(2, attempt) * 15); // 30s, 60s, 120s ... capped at 15 min
}

/** Retry only when it is provably safe; otherwise hand the payout to a human. */
async function retryOrEscalate(job, payout, message, issueType) {
  const attempts = (job.attempts || 0) + 1;
  if (attempts < (job.max_attempts || config.payouts.maxAttempts)) {
    await requeue(job, backoffSeconds(attempts), message);
    return { success: false, status: 'RETRYING' };
  }
  await flagForReconciliation(payout.id, [issueType], `${message} (after ${attempts} attempts)`, { source: 'WORKER' });
  await deadLetter(job, message);
  return { success: false, status: 'RECONCILIATION_REQUIRED' };
}

async function handleProviderHit(job, payout, lookup, source) {
  if (lookup.count > 1) {
    await flagForReconciliation(payout.id, ['DUPLICATE_PAYOUT'],
      `Razorpay holds ${lookup.count} payouts for reference ${payout.payout_number}`,
      { source, providerStatus: lookup.status, providerAmount: lookup.amount });
    await deadLetter(job, 'Duplicate payouts detected at provider');
    return { success: false, status: 'RECONCILIATION_REQUIRED' };
  }
  const outcome = await applyProviderState(payout, lookup, { source });
  return { success: outcome.applied, status: outcome.status || outcome.reason, payoutId: lookup.payoutId, utr: lookup.utr };
}

/**
 * Executes ONE claimed queue job against Razorpay.
 *  1. Reconcile first (does Razorpay already know this payout?)  -> never blind-POST
 *  2. POST with a deterministic provider idempotency key
 *  3. Timeout / 5xx  -> reconcile again; retry ONLY if provider lookup proves nothing exists
 */
export async function executeRazorpayPayout(job) {
  // Authoritative state comes from the DB, not from the job copy
  const { data: payout, error: pErr } = await supabaseA
    .from('seller_payout_requests').select('*').eq('id', job.payout_request_id).single();

  if (pErr || !payout) {
    await deadLetter(job, 'Payout request not found');
    return { success: false, status: 'MISSING_PAYOUT_REQUEST' };
  }

  if (!['PENDING', 'PROCESSING'].includes(payout.status)) {
    // Already finalized / flagged elsewhere (e.g. webhook beat us). Nothing to dispatch.
    await supabaseA.from('payout_queue')
      .update({ status: payout.status === 'RECONCILIATION_REQUIRED' ? 'DEAD_LETTER' : 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', job.id);
    return { success: true, status: 'SKIPPED_ALREADY_' + payout.status };
  }

  try {
    assertConfigured();
  } catch (err) {
    // Credentials problem: nothing was sent, safe to retry later
    return retryOrEscalate(job, payout, err.message, 'PROVIDER_CONFIG_ERROR');
  }

  // STEP 1 - pre-flight reconciliation
  const pre = await queryRazorpayPayoutByReference(payout.payout_number);
  if (pre.found) return handleProviderHit(job, payout, pre, 'WORKER');
  if (pre.lookupFailed) {
    // Unknown whether a previous attempt created a payout -> do NOT POST. Try again later.
    return retryOrEscalate(job, payout, `Pre-dispatch reconciliation failed: ${pre.error}`, 'RECONCILIATION_LOOKUP_FAILED');
  }

  // STEP 2 - dispatch
  const payload = {
    account_number: config.razorpay.accountNumber,
    amount: Math.round(Number(payout.amount) * 100),
    currency: 'INR',
    mode: 'UPI',
    purpose: 'payout',
    fund_account: {
      account_type: 'vpa',
      vpa: { address: payout.destination_upi },
      contact: { name: payout.beneficiary_name || 'Seller Settlement', type: 'vendor' }
    },
    queue_if_low_balance: true,
    reference_id: payout.payout_number,
    narration: 'ZebAlpha Settlement'
  };

  let response;
  try {
    response = await rzp('POST', '/payouts', {
      body: payload,
      headers: { 'X-Payout-Idempotency': providerIdempotencyKey(payout.payout_number) }
    });
  } catch (err) {
    // Network error / timeout: OUTCOME UNKNOWN.
    console.error(`[Payout Worker] Dispatch for ${payout.payout_number} had unknown outcome: ${err.message}`);
    return resolveUnknownOutcome(job, payout, err.message);
  }

  const { status, data } = response;

  if (status >= 200 && status < 300 && data?.id) {
    const outcome = await applyProviderState(payout, normalizeProviderPayout(data), { source: 'WORKER' });
    return { success: outcome.applied, status: outcome.status || outcome.reason, payoutId: data.id, utr: data.utr || null };
  }

  // Definitive rejections from Razorpay: nothing was created -> release the reservation
  if (status === 400 || status === 422) {
    const reason = data?.error?.description || 'Payout rejected by banking provider';
    await supabaseA.rpc('finalize_payout_failure', {
      p_payout_id: payout.id, p_failure_reason: reason, p_final_status: 'FAILED', p_source: 'WORKER'
    });
    return { success: false, status: 'FAILED', failureReason: reason };
  }

  // Authentication / rate limit: request was refused, so nothing was created. Safe to retry.
  if (status === 401 || status === 403 || status === 429) {
    return retryOrEscalate(job, payout, `Razorpay refused request (HTTP ${status}): ${data?.error?.description || ''}`, 'PROVIDER_REFUSED');
  }

  // 5xx / anything else: the payout MAY exist
  return resolveUnknownOutcome(job, payout, `HTTP ${status}: ${data?.error?.description || 'provider error'}`);
}

/** Outcome unknown (timeout/5xx). Ask Razorpay before doing ANYTHING else. */
async function resolveUnknownOutcome(job, payout, message) {
  const post = await queryRazorpayPayoutByReference(payout.payout_number);

  if (post.found) return handleProviderHit(job, payout, post, 'WORKER');

  if (post.lookupFailed) {
    // Cannot prove either way -> never retry; escalate to a human with money still reserved.
    await flagForReconciliation(payout.id, ['DISPATCH_OUTCOME_UNKNOWN'],
      `Dispatch outcome unknown (${message}) and provider lookup failed (${post.error}). Retry blocked.`, { source: 'WORKER' });
    await deadLetter(job, `Unknown outcome: ${message}`);
    return { success: false, status: 'RECONCILIATION_REQUIRED' };
  }

  // Provider confirms nothing exists -> retry is safe (same provider idempotency key)
  return retryOrEscalate(job, payout, `Dispatch failed, provider confirmed no payout: ${message}`, 'DISPATCH_FAILED_AFTER_RETRIES');
}

// ------------------------------------------------------------------------------
// Worker entry points
// ------------------------------------------------------------------------------
async function runWithConcurrency(items, limit, fn) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        await fn(item);
      } catch (err) {
        // Job stays PROCESSING; stale-lock recovery re-claims it and the pre-flight reconciliation keeps it safe
        console.error(`[Payout Worker] Job ${item.id} crashed:`, err.message);
      }
    }
  });
  await Promise.all(workers);
}

export async function processPayoutQueueBatch() {
  try {
    const { data: jobs, error } = await supabaseA.rpc('claim_payout_jobs', {
      p_worker: WORKER_ID,
      p_limit: config.payouts.batchSize,
      p_stale_seconds: 300
    });

    if (error) {
      console.error('[Payout Queue] claim failed:', error.message);
      return { error: error.message };
    }
    if (!jobs || jobs.length === 0) return { processed: 0 };

    console.log(`[Payout Queue Worker ${WORKER_ID}] Claimed ${jobs.length} job(s).`);
    await runWithConcurrency(jobs, config.payouts.concurrency, executeRazorpayPayout);
    return { processed: jobs.length };
  } catch (err) {
    console.error('[Payout Queue Batch Processing Exception]:', err.message);
    return { error: err.message };
  }
}

/**
 * Stuck withdrawal detector.
 * - asks Razorpay for the REAL state of every long-running payout
 * - applies only provider-confirmed final states (never releases money just because a webhook is late)
 * - otherwise flags the payout for investigation (money stays reserved)
 */
export async function detectAndReconcileStuckPayouts() {
  try {
    const threshold = new Date(Date.now() - config.payouts.stuckMinutes * 60 * 1000).toISOString();
    const recheckBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: stuck, error } = await supabaseA
      .from('seller_payout_requests')
      .select('*')
      .in('status', ACTIVE_STATUSES)
      .lte('created_at', threshold)
      .or(`provider_last_checked_at.is.null,provider_last_checked_at.lte.${recheckBefore}`)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !stuck || stuck.length === 0) return { checked: 0 };

    let flagged = 0;
    for (const payout of stuck) {
      let info = payout.provider_payout_id ? await queryRazorpayPayoutById(payout.provider_payout_id) : null;
      if (!info?.found && !info?.lookupFailed) info = await queryRazorpayPayoutByReference(payout.payout_number);

      await supabaseA.from('seller_payout_requests')
        .update({ provider_last_checked_at: new Date().toISOString() }).eq('id', payout.id);

      if (info?.lookupFailed) continue; // unknown -> try again next run, change nothing

      if (info?.found) {
        if (info.count > 1) {
          await flagForReconciliation(payout.id, ['DUPLICATE_PAYOUT'],
            `Razorpay holds ${info.count} payouts for ${payout.payout_number}`, { source: 'STUCK_DETECTOR', providerStatus: info.status, providerAmount: info.amount });
          flagged++;
          continue;
        }
        const outcome = await applyProviderState(payout, info, { source: 'STUCK_DETECTOR' });
        const stillOpen = outcome.status === 'PROCESSING';
        if (stillOpen && payout.status !== 'RECONCILIATION_REQUIRED') {
          await flagForReconciliation(payout.id, ['STUCK_PROCESSING'],
            `Payout still "${info.status}" at Razorpay after ${config.payouts.stuckMinutes} minutes.`,
            { source: 'STUCK_DETECTOR', providerStatus: info.status, providerAmount: info.amount });
          flagged++;
        }
        continue;
      }

      // Provider has no record. Payout may simply still be waiting in our queue - only escalate when old.
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      if (payout.created_at < twoHoursAgo && payout.status !== 'RECONCILIATION_REQUIRED') {
        await flagForReconciliation(payout.id, ['MISSING_PAYOUT', 'STUCK_PROCESSING'],
          'No payout exists at Razorpay 2+ hours after the request. Funds remain reserved.', { source: 'STUCK_DETECTOR' });
        flagged++;
      }
    }

    return { checked: stuck.length, flagged };
  } catch (err) {
    console.error('[Detect Stuck Payouts Exception]:', err.message);
    return { error: err.message };
  }
}

/** Automatic settlement: enqueue eligible sellers through the SAME reservation/queue path. */
export async function enqueueAutoSettlements(periodKey = new Date().toISOString().slice(0, 10)) {
  try {
    const { data, error } = await supabaseA.rpc('enqueue_auto_settlements', {
      p_period_key: periodKey,
      p_min_amount: config.payouts.autoSettlementMinAmount,
      p_limit: 200
    });
    if (error) return { error: error.message };
    return data;
  } catch (err) {
    return { error: err.message };
  }
}
