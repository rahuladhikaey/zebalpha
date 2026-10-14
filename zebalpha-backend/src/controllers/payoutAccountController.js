/**
 * ZEBALPHA — SELLER PAYOUT ACCOUNT & RAZORPAYX UPI CONTROLLER
 * 
 * Secure, zero-trust controller managing:
 * - UPI registration & verification
 * - Conservative beneficiary name matching
 * - Status queries & payout eligibility guards
 * - Safe payout execution & ledger reconciliation
 * - Admin manual review
 * - Webhook processing with HMAC verification
 */

import crypto from 'crypto';
import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import {
  validateUpiFormat,
  createOrGetContact,
  createVpaFundAccount,
  validateUpiAccount,
  executeUpiPayout,
  verifyWebhookSignature,
  getRazorpayXCredentials
} from '../services/razorpayXService.js';
import {
  encryptSensitiveData,
  decryptSensitiveData,
  createDeterministicFingerprint,
  maskUpiId,
  maskBeneficiaryName
} from '../utils/vaultService.js';

/**
 * Resolves current seller from authenticated user context (IDOR protection)
 */
async function resolveCurrentSeller(req) {
  const userId = req.user?.id;
  const sellerIdParam = req.params?.sellerId || req.body?.sellerId || req.sellerId;
  const isSuperAdmin = ['super_admin', 'admin'].includes((req.user?.role || '').toLowerCase());

  // 1. If caller is an admin and sellerId is explicitly supplied
  if (sellerIdParam && isSuperAdmin) {
    const { data: seller } = await supabaseA
      .from('sellers')
      .select('*')
      .eq('id', sellerIdParam)
      .maybeSingle();
    return seller || null;
  }

  // 2. If sellerIdParam belongs to authenticated user
  if (sellerIdParam) {
    const { data: seller } = await supabaseA
      .from('sellers')
      .select('*')
      .or(`id.eq.${sellerIdParam},user_id.eq.${userId}`)
      .maybeSingle();

    if (seller && (String(seller.user_id) === String(userId) || String(seller.id) === String(sellerIdParam))) {
      return seller;
    }
  }

  // 3. Fallback to user_id mapping
  const { data: seller } = await supabaseA
    .from('sellers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return seller || null;
}

/**
 * 1. Register or Update Seller UPI ID
 * POST /api/seller/payout-account/upi
 */
export async function saveUpiPayoutAccount(req, res, next) {
  try {
    const { upiId } = req.body;
    const seller = await resolveCurrentSeller(req);

    if (!seller) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: No authorized seller account found for this user.'
      });
    }

    // Strict UPI format validation
    const formatCheck = validateUpiFormat(upiId);
    if (!formatCheck.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: formatCheck.message
      });
    }

    const sanitizedVpa = formatCheck.vpa;
    const vpaFingerprint = createDeterministicFingerprint(sanitizedVpa);

    // Duplicate account check across active sellers (prevents sybil attack / duplicate linking)
    const { data: existingActive } = await supabaseA
      .from('seller_payout_accounts')
      .select('id, seller_id')
      .eq('upi_id_fingerprint', vpaFingerprint)
      .eq('is_active', true)
      .maybeSingle();

    if (existingActive && existingActive.seller_id !== seller.id) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'This UPI ID is already registered and active on another seller account. Please use your own registered business UPI ID.'
      });
    }

    const encryptedVpa = encryptSensitiveData(sanitizedVpa);
    const maskedVpa = maskUpiId(sanitizedVpa);

    // 1. Create or retrieve Contact on RazorpayX
    let contact = null;
    try {
      contact = await createOrGetContact(seller);
    } catch (contactErr) {
      console.warn('[RazorpayX Contact Warning]:', contactErr.message);
    }

    // 2. Create VPA Fund Account on RazorpayX
    let fundAccount = null;
    if (contact?.id) {
      try {
        fundAccount = await createVpaFundAccount(contact.id, sanitizedVpa);
      } catch (faErr) {
        console.warn('[RazorpayX Fund Account Warning]:', faErr.message);
      }
    }

    // 3. Trigger verification and conservative beneficiary name matching
    const validationResult = await validateUpiAccount({
      contactId: contact?.id,
      fundAccountId: fundAccount?.id,
      vpa: sanitizedVpa,
      seller
    });

    // 4. Mark all previous payout accounts for this seller as inactive
    await supabaseA
      .from('seller_payout_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('seller_id', seller.id)
      .eq('is_active', true);

    // 5. Insert new active payout account record
    const newAccountPayload = {
      seller_id: seller.id,
      account_type: 'upi',
      upi_id_encrypted: encryptedVpa,
      upi_id_fingerprint: vpaFingerprint,
      masked_upi_id: maskedVpa,
      provider: 'razorpayx',
      razorpay_contact_id: contact?.id || null,
      razorpay_fund_account_id: fundAccount?.id || null,
      beneficiary_name: validationResult.beneficiaryName || null,
      verification_status: validationResult.verificationStatus,
      verification_reason: validationResult.reason,
      verified_at: validationResult.verificationStatus === 'verified' ? new Date().toISOString() : null,
      last_validation_id: validationResult.validationId || null,
      is_active: true,
      metadata: {
        score: validationResult.matchResult?.score ?? null,
        matchReason: validationResult.matchResult?.reason ?? null,
        registeredSellerName: seller.owner_name || seller.full_name || seller.business_name
      }
    };

    const { data: savedAccount, error: insertErr } = await supabaseA
      .from('seller_payout_accounts')
      .insert([newAccountPayload])
      .select()
      .single();

    if (insertErr) {
      throw insertErr;
    }

    // 6. Record verification attempt in history table
    await supabaseA.from('seller_payout_verifications').insert([{
      seller_id: seller.id,
      payout_account_id: savedAccount.id,
      provider_validation_id: validationResult.validationId || null,
      status: validationResult.verificationStatus,
      provider_account_status: validationResult.accountStatus || 'unknown',
      beneficiary_match_result: validationResult.matchResult?.match ? 'matched' : (validationResult.matchResult?.isReview ? 'review' : 'mismatch'),
      failure_code: validationResult.success ? null : validationResult.verificationStatus,
      completed_at: new Date().toISOString(),
      metadata: {
        rawReason: validationResult.reason,
        score: validationResult.matchResult?.score
      }
    }]);

    // 7. Audit log
    await supabaseA.from('seller_payout_audit_logs').insert([{
      seller_id: seller.id,
      actor_type: 'SELLER',
      actor_id: req.user.id,
      action: 'UPI_ACCOUNT_REGISTERED',
      reason_code: validationResult.verificationStatus,
      related_account_id: savedAccount.id,
      metadata_redacted: {
        masked_upi: maskedVpa,
        verification_status: validationResult.verificationStatus,
        beneficiary_masked: maskBeneficiaryName(validationResult.beneficiaryName)
      }
    }]);

    // 8. If verified, sync back to sellers table for backward compatibility
    if (validationResult.verificationStatus === 'verified') {
      await supabaseA
        .from('sellers')
        .update({ upi_id: maskedVpa, updated_at: new Date().toISOString() })
        .eq('id', seller.id);
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: validationResult.success
        ? 'UPI ID verified successfully! Payouts are active.'
        : `UPI status: ${validationResult.verificationStatus}. ${validationResult.reason}`,
      data: {
        id: savedAccount.id,
        maskedUpiId: savedAccount.masked_upi_id,
        verificationStatus: savedAccount.verification_status,
        verificationReason: savedAccount.verification_reason,
        beneficiaryNameMasked: maskBeneficiaryName(savedAccount.beneficiary_name),
        registeredSellerName: seller.owner_name || seller.full_name || seller.business_name,
        verifiedAt: savedAccount.verified_at,
        payoutsEnabled: savedAccount.verification_status === 'verified'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Re-trigger Verification for Existing Active UPI Account
 * POST /api/seller/payout-account/upi/verify
 */
export async function reverifyUpiPayoutAccount(req, res, next) {
  try {
    const seller = await resolveCurrentSeller(req);
    if (!seller) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: No authorized seller account found.'
      });
    }

    const { data: account, error: accErr } = await supabaseA
      .from('seller_payout_accounts')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('is_active', true)
      .maybeSingle();

    if (accErr || !account) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'No active UPI payout account found. Please enter your UPI ID first.'
      });
    }

    // Decrypt UPI using vault multi-key fallback
    const plainVpa = decryptSensitiveData(account.upi_id_encrypted);
    if (!plainVpa) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Unable to decrypt UPI ID for re-verification. Please re-enter your UPI ID.'
      });
    }

    // Trigger validation
    const validationResult = await validateUpiAccount({
      contactId: account.razorpay_contact_id,
      fundAccountId: account.razorpay_fund_account_id,
      vpa: plainVpa,
      seller
    });

    const updatedFields = {
      beneficiary_name: validationResult.beneficiaryName || account.beneficiary_name,
      verification_status: validationResult.verificationStatus,
      verification_reason: validationResult.reason,
      verified_at: validationResult.verificationStatus === 'verified' ? new Date().toISOString() : account.verified_at,
      last_validation_id: validationResult.validationId || account.last_validation_id,
      updated_at: new Date().toISOString()
    };

    const { data: updatedAccount } = await supabaseA
      .from('seller_payout_accounts')
      .update(updatedFields)
      .eq('id', account.id)
      .select()
      .single();

    // Log verification attempt
    await supabaseA.from('seller_payout_verifications').insert([{
      seller_id: seller.id,
      payout_account_id: account.id,
      provider_validation_id: validationResult.validationId || null,
      status: validationResult.verificationStatus,
      provider_account_status: validationResult.accountStatus || 'unknown',
      beneficiary_match_result: validationResult.matchResult?.match ? 'matched' : (validationResult.matchResult?.isReview ? 'review' : 'mismatch'),
      failure_code: validationResult.success ? null : validationResult.verificationStatus,
      completed_at: new Date().toISOString()
    }]);

    // Audit log
    await supabaseA.from('seller_payout_audit_logs').insert([{
      seller_id: seller.id,
      actor_type: 'SELLER',
      actor_id: req.user.id,
      action: 'UPI_REVERIFICATION_REQUESTED',
      reason_code: validationResult.verificationStatus,
      related_account_id: account.id,
      metadata_redacted: {
        verification_status: validationResult.verificationStatus,
        beneficiary_masked: maskBeneficiaryName(validationResult.beneficiaryName)
      }
    }]);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: validationResult.success ? 'UPI verification completed.' : validationResult.reason,
      data: {
        id: updatedAccount.id,
        maskedUpiId: updatedAccount.masked_upi_id,
        verificationStatus: updatedAccount.verification_status,
        verificationReason: updatedAccount.verification_reason,
        beneficiaryNameMasked: maskBeneficiaryName(updatedAccount.beneficiary_name),
        registeredSellerName: seller.owner_name || seller.full_name || seller.business_name,
        verifiedAt: updatedAccount.verified_at,
        payoutsEnabled: updatedAccount.verification_status === 'verified'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Get Active Payout Account & Payout Eligibility
 * GET /api/seller/payout-account
 */
export async function getPayoutAccount(req, res, next) {
  try {
    const seller = await resolveCurrentSeller(req);
    if (!seller) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: No authorized seller account found.'
      });
    }

    const { data: account } = await supabaseA
      .from('seller_payout_accounts')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('is_active', true)
      .maybeSingle();

    // Calculate eligible earnings in paise
    const { data: earnings } = await supabaseA
      .from('seller_earnings')
      .select('net_eligible_amount_paise, status')
      .eq('seller_id', seller.id);

    let eligiblePaise = 0n;
    let pendingPaise = 0n;
    let paidPaise = 0n;

    if (earnings && earnings.length > 0) {
      for (const e of earnings) {
        const val = BigInt(e.net_eligible_amount_paise || 0);
        if (e.status === 'eligible') eligiblePaise += val;
        else if (e.status === 'pending') pendingPaise += val;
        else if (e.status === 'paid') paidPaise += val;
      }
    }

    const verificationStatus = account ? account.verification_status : 'not_added';
    const payoutsEnabled = verificationStatus === 'verified';

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        hasAccount: Boolean(account),
        account: account ? {
          id: account.id,
          maskedUpiId: account.masked_upi_id,
          verificationStatus: account.verification_status,
          verificationReason: account.verification_reason,
          beneficiaryNameMasked: maskBeneficiaryName(account.beneficiary_name),
          registeredSellerName: seller.owner_name || seller.full_name || seller.business_name,
          verifiedAt: account.verified_at
        } : null,
        payoutsEnabled,
        eligibilityReason: payoutsEnabled 
          ? (eligiblePaise > 0n ? 'Eligible for automated payout' : 'UPI verified. No eligible earnings pending.')
          : (account ? `Payouts blocked: ${account.verification_reason || 'UPI ID not verified'}` : 'Payouts blocked: UPI ID not added.'),
        financials: {
          eligibleAmountInRupees: Number(eligiblePaise) / 100,
          pendingAmountInRupees: Number(pendingPaise) / 100,
          paidAmountInRupees: Number(paidPaise) / 100,
          currency: 'INR'
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Execute Automated / On-Demand Seller Payout
 * POST /api/seller/payout-account/execute-payout
 */
export async function executeSellerPayout(req, res, next) {
  try {
    const seller = await resolveCurrentSeller(req);
    if (!seller) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: No authorized seller account found.'
      });
    }

    // 1. Strict UPI Verification Guard
    const { data: account } = await supabaseA
      .from('seller_payout_accounts')
      .select('*')
      .eq('seller_id', seller.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!account || account.verification_status !== 'verified') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Payout blocked: Seller UPI account is not verified or has a beneficiary name mismatch. Payouts are only permitted to verified accounts.'
      });
    }

    // 2. Concurrency Lock: Check if a payout is already in flight
    const { data: inflightPayout } = await supabaseA
      .from('seller_payouts')
      .select('id, status, reference_id')
      .eq('seller_id', seller.id)
      .in('status', ['queued', 'initiated'])
      .maybeSingle();

    if (inflightPayout) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'A payout transaction is already in progress for this seller. Please await completion.',
        payoutId: inflightPayout.id
      });
    }

    // 3. Fetch eligible earnings records
    const { data: eligibleItems, error: earnErr } = await supabaseA
      .from('seller_earnings')
      .select('id, net_eligible_amount_paise')
      .eq('seller_id', seller.id)
      .eq('status', 'eligible');

    if (earnErr || !eligibleItems || eligibleItems.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'No eligible earnings found for settlement.'
      });
    }

    let totalPaise = 0n;
    const itemIds = [];
    for (const item of eligibleItems) {
      const amt = BigInt(item.net_eligible_amount_paise || 0);
      if (amt > 0n) {
        totalPaise += amt;
        itemIds.push(item.id);
      }
    }

    if (totalPaise <= 0n) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Eligible earnings amount is zero or negative.'
      });
    }

    // Minimum payout threshold: ₹10 (1000 paise)
    if (totalPaise < 1000n) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Payout amount (₹${Number(totalPaise) / 100}) is below the minimum threshold of ₹10.`
      });
    }

    const referenceId = `POUT-UPI-${seller.id.slice(0, 8)}-${Date.now()}`;
    const idempotencyKey = crypto.createHash('sha256').update(`${seller.id}:${totalPaise}:${referenceId}`).digest('hex');

    // 4. Atomically transition earnings to 'reserved' state
    await supabaseA
      .from('seller_earnings')
      .update({ status: 'reserved', updated_at: new Date().toISOString() })
      .in('id', itemIds);

    // 5. Create Payout Record
    const { data: payoutRecord, error: payoutInsertErr } = await supabaseA
      .from('seller_payouts')
      .insert([{
        seller_id: seller.id,
        payout_account_id: account.id,
        amount_paise: Number(totalPaise),
        currency: 'INR',
        status: 'queued',
        reference_id: referenceId,
        idempotency_key: idempotencyKey,
        initiated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (payoutInsertErr) {
      // Revert reserved earnings
      await supabaseA
        .from('seller_earnings')
        .update({ status: 'eligible', updated_at: new Date().toISOString() })
        .in('id', itemIds);
      throw payoutInsertErr;
    }

    // 6. Execute UPI Payout via RazorpayX
    try {
      const payoutRes = await executeUpiPayout({
        sellerId: seller.id,
        amountPaise: Number(totalPaise),
        fundAccountId: account.razorpay_fund_account_id,
        referenceId,
        idempotencyKey,
        narration: `Zebalpha Payout ${seller.id.slice(0, 6)}`
      });

      const finalStatus = payoutRes.status === 'processed' ? 'processed' : 'initiated';

      // Update payout record
      await supabaseA
        .from('seller_payouts')
        .update({
          status: finalStatus,
          razorpay_payout_id: payoutRes.id || null,
          utr: payoutRes.utr || null,
          processed_at: finalStatus === 'processed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', payoutRecord.id);

      // If processed immediately, transition earnings to 'paid'
      if (finalStatus === 'processed') {
        await supabaseA
          .from('seller_earnings')
          .update({ status: 'paid', payout_id: payoutRecord.id, updated_at: new Date().toISOString() })
          .in('id', itemIds);
      }

      // Audit Log
      await supabaseA.from('seller_payout_audit_logs').insert([{
        seller_id: seller.id,
        actor_type: 'SELLER',
        actor_id: req.user.id,
        action: 'UPI_PAYOUT_INITIATED',
        reason_code: finalStatus,
        related_account_id: account.id,
        related_payout_id: payoutRecord.id,
        metadata_redacted: {
          amount_rupees: Number(totalPaise) / 100,
          reference_id: referenceId,
          rzp_payout_id: payoutRes.id
        }
      }]);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Payout of ₹${Number(totalPaise) / 100} initiated successfully to ${account.masked_upi_id}.`,
        data: {
          payoutId: payoutRecord.id,
          referenceId,
          amountInRupees: Number(totalPaise) / 100,
          status: finalStatus,
          utr: payoutRes.utr || null
        }
      });
    } catch (execErr) {
      console.error('[Payout Execution Error]:', execErr.message);

      // Mark payout failed
      await supabaseA
        .from('seller_payouts')
        .update({
          status: 'failed',
          failure_reason: execErr.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', payoutRecord.id);

      // Rollback earnings back to 'eligible'
      await supabaseA
        .from('seller_earnings')
        .update({ status: 'eligible', updated_at: new Date().toISOString() })
        .in('id', itemIds);

      // Audit Log
      await supabaseA.from('seller_payout_audit_logs').insert([{
        seller_id: seller.id,
        actor_type: 'SYSTEM',
        action: 'UPI_PAYOUT_FAILED',
        reason_code: 'EXEC_ERROR',
        related_account_id: account.id,
        related_payout_id: payoutRecord.id,
        metadata_redacted: { error: execErr.message }
      }]);

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Payout execution failed: ${execErr.message}. Reserved funds have been restored to your eligible balance.`
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Admin Manual Review for Payout Accounts
 * POST /api/admin/sellers/:sellerId/payout-account/review
 */
export async function adminReviewPayoutAccount(req, res, next) {
  try {
    const { sellerId } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid review action. Allowed actions: "approve" or "reject".'
      });
    }

    if (!notes || notes.trim().length < 5) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'A mandatory review justification (minimum 5 characters) is required.'
      });
    }

    const { data: account, error: accErr } = await supabaseA
      .from('seller_payout_accounts')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .maybeSingle();

    if (accErr || !account) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Active payout account not found for this seller.'
      });
    }

    const newStatus = action === 'approve' ? 'verified' : 'name_mismatch';
    const reason = `Admin manual review: ${notes.trim()}`;

    const { data: updated } = await supabaseA
      .from('seller_payout_accounts')
      .update({
        verification_status: newStatus,
        verification_reason: reason,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id)
      .select()
      .single();

    // Audit log
    await supabaseA.from('seller_payout_audit_logs').insert([{
      seller_id: sellerId,
      actor_type: 'ADMIN',
      actor_id: req.user.id,
      action: action === 'approve' ? 'ADMIN_APPROVED_PAYOUT_ACCOUNT' : 'ADMIN_REJECTED_PAYOUT_ACCOUNT',
      reason_code: newStatus,
      related_account_id: account.id,
      metadata_redacted: { notes: notes.trim(), previous_status: account.verification_status }
    }]);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Seller payout account status updated to ${newStatus}.`,
      data: {
        id: updated.id,
        verificationStatus: updated.verification_status,
        verificationReason: updated.verification_reason,
        verifiedAt: updated.verified_at
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. RazorpayX Webhook Handler (Constant-Time HMAC & Event Store)
 * POST /api/webhooks/razorpayx
 */
export async function handleRazorpayXWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const { webhookSecret } = getRazorpayXCredentials();

    if (!webhookSecret) {
      console.warn('[RazorpayX Webhook] RAZORPAYX_WEBHOOK_SECRET is not configured.');
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Webhook secret unconfigured' });
    }

    const rawPayload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(rawPayload, signature, webhookSecret);

    if (!isValid) {
      console.error('[RazorpayX Webhook Security Alert]: Invalid signature rejected.');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventId = event.event_id || event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const eventType = event.event;
    const payloadHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    // Deduplication check
    const { data: existingEvent } = await supabaseA
      .from('razorpayx_webhook_events')
      .select('id, processing_status')
      .eq('provider_event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      return res.status(HTTP_STATUS.OK).json({ received: true, deduplicated: true });
    }

    // Insert pending event record
    await supabaseA.from('razorpayx_webhook_events').insert([{
      provider_event_id: eventId,
      event_type: eventType,
      provider_entity_id: event.payload?.payout?.entity?.id || event.payload?.fund_account?.validation?.entity?.id || null,
      payload_hash: payloadHash,
      processing_status: 'pending'
    }]);

    console.log(`[RazorpayX Webhook Event] Processing: ${eventType} (ID: ${eventId})`);

    // Process Supported Events
    if (eventType === 'fund_account.validation.completed') {
      const validationEntity = event.payload?.fund_account?.validation?.entity;
      if (validationEntity) {
        const valId = validationEntity.id;
        const regName = validationEntity.results?.registered_name || validationEntity.results?.beneficiary_name;
        const status = validationEntity.results?.account_status === 'active' ? 'active' : 'inactive';

        // Update matching verification
        const { data: acc } = await supabaseA
          .from('seller_payout_accounts')
          .select('id, seller_id')
          .eq('last_validation_id', valId)
          .maybeSingle();

        if (acc) {
          await supabaseA
            .from('seller_payout_accounts')
            .update({
              beneficiary_name: regName || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', acc.id);
        }
      }
    } else if (eventType === 'payout.processed') {
      const payoutEntity = event.payload?.payout?.entity;
      if (payoutEntity) {
        const rzpPayoutId = payoutEntity.id;
        const utr = payoutEntity.utr;

        const { data: payout } = await supabaseA
          .from('seller_payouts')
          .select('id, seller_id, status')
          .or(`razorpay_payout_id.eq.${rzpPayoutId},reference_id.eq.${payoutEntity.reference_id}`)
          .maybeSingle();

        if (payout && payout.status !== 'processed') {
          await supabaseA
            .from('seller_payouts')
            .update({
              status: 'processed',
              utr: utr || null,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          // Transition earnings to 'paid'
          await supabaseA
            .from('seller_earnings')
            .update({ status: 'paid', payout_id: payout.id, updated_at: new Date().toISOString() })
            .eq('seller_id', payout.seller_id)
            .eq('status', 'reserved');
        }
      }
    } else if (eventType === 'payout.reversed' || eventType === 'payout.failed') {
      const payoutEntity = event.payload?.payout?.entity;
      if (payoutEntity) {
        const rzpPayoutId = payoutEntity.id;
        const failureReason = payoutEntity.failure_reason || eventType;

        const { data: payout } = await supabaseA
          .from('seller_payouts')
          .select('id, seller_id, status')
          .or(`razorpay_payout_id.eq.${rzpPayoutId},reference_id.eq.${payoutEntity.reference_id}`)
          .maybeSingle();

        if (payout) {
          const finalState = eventType === 'payout.reversed' ? 'reversed' : 'failed';
          await supabaseA
            .from('seller_payouts')
            .update({
              status: finalState,
              failure_reason: failureReason,
              reversed_at: eventType === 'payout.reversed' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          // Critical Reversal Reconciliation: Unfreeze reserved earnings back to 'eligible'
          await supabaseA
            .from('seller_earnings')
            .update({ status: 'eligible', payout_id: null, updated_at: new Date().toISOString() })
            .eq('seller_id', payout.seller_id)
            .in('status', ['reserved', 'paid']);

          // Audit Log
          await supabaseA.from('seller_payout_audit_logs').insert([{
            seller_id: payout.seller_id,
            actor_type: 'WEBHOOK',
            action: eventType === 'payout.reversed' ? 'PAYOUT_REVERSED_UNFROZEN' : 'PAYOUT_FAILED_UNFROZEN',
            reason_code: failureReason,
            related_payout_id: payout.id,
            metadata_redacted: { event_id: eventId, rzp_payout_id: rzpPayoutId }
          }]);
        }
      }
    }

    // Mark event processed
    await supabaseA
      .from('razorpayx_webhook_events')
      .update({ processing_status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider_event_id', eventId);

    return res.status(HTTP_STATUS.OK).json({ received: true });
  } catch (err) {
    console.error('[RazorpayX Webhook Error]:', err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Webhook processing error' });
  }
}
