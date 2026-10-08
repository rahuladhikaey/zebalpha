import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { sendSellerStatusEmail } from '../utils/email.js';
import { reconcilePayout, reconcileAllActivePayouts } from '../services/reconciliationService.js';
import { processPayoutQueueBatch, detectAndReconcileStuckPayouts } from '../services/payoutQueueService.js';
import { createLinkedAccount, getTransferDetails, getLinkedAccount } from '../services/razorpayRouteService.js';
import { evaluateDeliveredOrders, processEligibleSettlementBatches } from '../services/settlementEligibilityService.js';

/**
 * Fetch Comprehensive Admin Settlement & Payout Overview
 */
export const getSettlementOverview = async (req, res, next) => {
  try {
    // 1. Call PostgreSQL RPC for aggregated overview
    const { data: overview, error: rpcErr } = await supabaseA.rpc('get_admin_settlement_overview');
    if (rpcErr) {
      console.warn('[Overview RPC Warning]:', rpcErr.message);
    }

    // 2. Fetch recent payout requests
    const { data: recentPayouts } = await supabaseA
      .from('seller_payout_requests')
      .select('*, sellers:seller_id(business_name, owner_name, email, upi_id, phonepay_number, phonepay_no)')
      .order('created_at', { ascending: false })
      .limit(10);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: overview || {
        total_seller_earnings: 0,
        total_pending_balance: 0,
        total_available_balance: 0,
        total_reserved_balance: 0,
        total_withdrawn: 0,
        total_withdrawals_count: 0,
        total_processing_payouts: 0,
        total_processing_amount: 0,
        total_successful_payouts: 0,
        total_successful_amount: 0,
        total_failed_payouts: 0,
        total_failed_amount: 0,
        total_reversed_payouts: 0,
        total_reversed_amount: 0,
        reconciliation_issues_count: 0,
        stuck_payouts_count: 0
      },
      recentPayouts: recentPayouts || []
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Payout Requests list with advanced filtering & search
 */
export const getPayoutRequests = async (req, res, next) => {
  try {
    const { 
      status, 
      sellerId, 
      search, 
      startDate, 
      endDate, 
      minAmount, 
      maxAmount, 
      page = 1, 
      limit = 50,
      longProcessing
    } = req.query;

    let query = supabaseA
      .from('seller_payout_requests')
      .select('*, sellers:seller_id(id, business_name, owner_name, email, mobile_number, upi_id, phonepay_number, phonepay_no)', { count: 'exact' });

    // Status Filter
    if (status && status !== 'ALL') {
      if (status === 'LONG_PROCESSING') {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        query = query.in('status', ['PENDING', 'PROCESSING']).lte('created_at', thirtyMinutesAgo);
      } else {
        query = query.eq('status', status.toUpperCase());
      }
    }

    if (longProcessing === 'true') {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      query = query.in('status', ['PENDING', 'PROCESSING']).lte('created_at', thirtyMinutesAgo);
    }

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (minAmount) {
      query = query.gte('amount', Number(minAmount));
    }

    if (maxAmount) {
      query = query.lte('amount', Number(maxAmount));
    }

    const from = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const to = from + parseInt(limit, 10) - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    let filteredData = data || [];

    // Client-side text search if provided
    if (search) {
      const searchLower = search.toLowerCase().trim();
      filteredData = filteredData.filter(p => 
        p.payout_number?.toLowerCase().includes(searchLower) ||
        p.provider_payout_id?.toLowerCase().includes(searchLower) ||
        p.utr_number?.toLowerCase().includes(searchLower) ||
        p.destination_masked?.toLowerCase().includes(searchLower) ||
        p.destination_upi?.toLowerCase().includes(searchLower) ||
        p.sellers?.business_name?.toLowerCase().includes(searchLower) ||
        p.sellers?.owner_name?.toLowerCase().includes(searchLower) ||
        p.sellers?.email?.toLowerCase().includes(searchLower)
      );
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: count || filteredData.length,
      data: filteredData
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Detailed View of a Single Payout with Complete Transaction Timeline
 */
export const getPayoutDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: payout, error: pErr } = await supabaseA
      .from('seller_payout_requests')
      .select('*, sellers:seller_id(*), settlement_method:settlement_method_id(*)')
      .eq('id', id)
      .single();

    if (pErr || !payout) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Payout record not found' });
    }

    // Fetch related ledger transactions
    const { data: ledgerEntries } = await supabaseA
      .from('seller_financial_ledger')
      .select('*')
      .or(`reference_id.eq.${payout.payout_number},idempotency_key.ilike.%${payout.idempotency_key || 'none'}%`)
      .order('created_at', { ascending: true });

    // Fetch related webhook events
    const { data: webhookEvents } = await supabaseA
      .from('webhook_events')
      .select('*')
      .or(`entity_id.eq.${payout.provider_payout_id || 'none'},entity_id.eq.${payout.payout_number}`)
      .order('created_at', { ascending: true });

    // Fetch queue job status
    const { data: queueJob } = await supabaseA
      .from('payout_queue')
      .select('*')
      .eq('payout_request_id', payout.id)
      .maybeSingle();

    // Construct transaction timeline
    const timeline = [
      {
        step: 'WITHDRAWAL_REQUESTED',
        title: 'Withdrawal Requested by Seller',
        status: 'COMPLETED',
        timestamp: payout.initiated_at || payout.created_at,
        description: `Seller initiated UPI withdrawal for ₹${payout.amount} to ${payout.destination_masked}.`
      },
      {
        step: 'BALANCE_RESERVED',
        title: 'Balance Reserved (Anti-Double Spend)',
        status: 'COMPLETED',
        timestamp: payout.created_at,
        description: `₹${payout.amount} moved from Available Balance to Reserved Balance.`
      },
      {
        step: 'PAYOUT_QUEUED',
        title: 'Payout Queued for Worker Dispatch',
        status: queueJob ? (queueJob.status === 'COMPLETED' ? 'COMPLETED' : queueJob.status === 'FAILED' ? 'FAILED' : 'IN_PROGRESS') : 'COMPLETED',
        timestamp: queueJob?.created_at || payout.created_at,
        description: `Job ID: ${queueJob?.id || 'Direct Dispatch'}, Attempts: ${queueJob?.attempts || 1}`
      },
      {
        step: 'RAZORPAY_PROCESSING',
        title: 'Dispatched to Razorpay Banking Rails',
        status: payout.provider_payout_id ? 'COMPLETED' : (payout.status === 'FAILED' ? 'FAILED' : 'IN_PROGRESS'),
        timestamp: payout.initiated_at || payout.created_at,
        description: payout.provider_payout_id 
          ? `Razorpay Payout ID: ${payout.provider_payout_id} (${payout.provider_status || 'Initiated'})`
          : (payout.failure_reason ? `Failed: ${payout.failure_reason}` : 'Awaiting Razorpay network response')
      },
      {
        step: 'WEBHOOK_RECEIVED',
        title: 'Provider Webhook Confirmation',
        status: webhookEvents && webhookEvents.length > 0 ? 'COMPLETED' : (payout.status === 'SUCCESS' ? 'COMPLETED' : 'PENDING'),
        timestamp: webhookEvents?.[0]?.created_at || payout.processed_at,
        description: webhookEvents && webhookEvents.length > 0
          ? `Received event: ${webhookEvents[0].event_type} (${webhookEvents[0].status})`
          : (payout.status === 'SUCCESS' ? 'Confirmed via direct provider query' : 'Awaiting webhook from Razorpay')
      },
      {
        step: 'FINAL_STATUS',
        title: `Final Payout Status: ${payout.status}`,
        status: payout.status === 'SUCCESS' ? 'COMPLETED' : payout.status === 'FAILED' ? 'FAILED' : payout.status === 'REVERSED' ? 'REVERSED' : 'IN_PROGRESS',
        timestamp: payout.processed_at || payout.updated_at,
        description: payout.status === 'SUCCESS'
          ? `Funds transferred successfully. UTR: ${payout.utr_number || 'Confirmed'}`
          : payout.status === 'FAILED'
            ? `Withdrawal failed: ${payout.failure_reason || 'Provider rejection'}. Balance returned to seller.`
            : `Current state: ${payout.status}`
      }
    ];

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        payout,
        timeline,
        ledgerEntries: ledgerEntries || [],
        webhookEvents: webhookEvents || [],
        queueJob: queueJob || null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Comprehensive Seller Financial Details for Admin Modal
 */
export const getSellerFinancialDetails = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    // 1. Fetch seller profile
    const { data: seller, error: sErr } = await supabaseA
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single();

    if (sErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Seller not found' });
    }

    // 2. Fetch full ledger
    const { data: ledgerRows } = await supabaseA
      .from('seller_financial_ledger')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    // 3. Fetch all payout requests
    const { data: payouts } = await supabaseA
      .from('seller_payout_requests')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    // 4. Fetch settlement methods
    const { data: settlementMethods } = await supabaseA
      .from('seller_settlement_methods')
      .select('*')
      .eq('seller_id', sellerId)
      .order('is_default', { ascending: false });

    // 5. Compute accurate balances
    const ledger = ledgerRows || [];
    let grossSales = 0;
    let commission = 0;
    let fixedFees = 0;
    let shippingFees = 0;
    let collectionFees = 0;
    let returnsAndRefunds = 0;
    let totalSettled = 0;
    let reservedBalance = 0;
    let pendingEscrow = 0;

    ledger.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.status === 'PENDING') {
        if (tx.transaction_type === 'WITHDRAWAL_REQUESTED' || tx.transaction_type === 'WITHDRAWAL_PROCESSING') {
          reservedBalance += amt;
        } else {
          pendingEscrow += amt;
        }
      } else if (tx.status === 'COMPLETED') {
        if (tx.entry_type === 'CREDIT' && (tx.transaction_type === 'SALE' || tx.transaction_type === 'SALE_CREDIT' || tx.transaction_type === 'ADJUSTMENT_CREDIT')) {
          grossSales += amt;
        } else if (tx.transaction_type === 'COMMISSION' || tx.transaction_type === 'COMMISSION_DEDUCTION') {
          commission += amt;
        } else if (tx.transaction_type === 'FIXED_FEE') {
          fixedFees += amt;
        } else if (tx.transaction_type === 'SHIPPING_FEE') {
          shippingFees += amt;
        } else if (tx.transaction_type === 'COLLECTION_FEE') {
          collectionFees += amt;
        } else if (['REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE', 'TAX', 'PENALTY', 'ADJUSTMENT_DEBIT'].includes(tx.transaction_type)) {
          returnsAndRefunds += amt;
        } else if (tx.transaction_type === 'SETTLEMENT' || tx.transaction_type === 'WITHDRAWAL_SUCCESS') {
          totalSettled += amt;
        } else if (tx.transaction_type === 'SETTLEMENT_REVERSAL' || tx.transaction_type === 'WITHDRAWAL_REVERSED') {
          totalSettled = Math.max(0, totalSettled - amt);
        }
      }
    });

    const totalPlatformDeductions = commission + fixedFees + shippingFees + collectionFees + returnsAndRefunds;
    const netSellerEarnings = Math.max(0, grossSales - totalPlatformDeductions);
    const availableBalance = Math.max(0, netSellerEarnings - totalSettled - reservedBalance);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        seller,
        balances: {
          gross_sales: grossSales,
          commission,
          fixed_fees: fixedFees,
          shipping_fees: shippingFees,
          collection_fees: collectionFees,
          returns_and_refunds: returnsAndRefunds,
          total_deductions: totalPlatformDeductions,
          net_seller_earnings: netSellerEarnings,
          total_settled: totalSettled,
          available_balance: availableBalance,
          reserved_balance: reservedBalance,
          pending_settlement: pendingEscrow
        },
        settlementMethods: settlementMethods || [],
        payouts: payouts || [],
        ledger: ledger || []
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger Admin-Reconciliation for a Single Payout (Audited)
 */
export const reconcileSinglePayout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = req.user;

    const result = await reconcilePayout(id, {
      id: adminUser?.id || 'admin',
      email: adminUser?.email || 'admin@zebalpha.shop',
      reason: reason || 'Admin manual reconciliation audit check',
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Admin Dashboard'
    });

    res.status(HTTP_STATUS.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger Batch Reconciliation across all pending/active payouts
 */
export const reconcileAllPayouts = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const adminUser = req.user;

    const result = await reconcileAllActivePayouts({
      id: adminUser?.id || 'admin',
      email: adminUser?.email || 'admin@zebalpha.shop',
      reason: reason || 'Batch reconciliation initiated from Admin Dashboard',
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Admin Dashboard'
    });

    res.status(HTTP_STATUS.OK).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Admin Financial Audit Logs
 */
export const getAdminAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, sellerId } = req.query;

    let query = supabaseA
      .from('admin_audit_logs')
      .select('*', { count: 'exact' });

    if (action) {
      query = query.eq('action', action);
    }
    if (sellerId) {
      query = query.eq('target_seller_id', sellerId);
    }

    const from = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const to = from + parseInt(limit, 10) - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: count || data?.length || 0,
      data: data || []
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger Payout Queue Worker immediately (On-Demand)
 */
export const triggerPayoutWorker = async (req, res, next) => {
  try {
    const queueResult = await processPayoutQueueBatch();
    const stuckResult = await detectAndReconcileStuckPayouts();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payout queue worker and stuck payout reconciler executed successfully.',
      queueResult,
      stuckResult
    });
  } catch (err) {
    next(err);
  }
};

// ==============================================================================
// LEGACY WEEKLY SETTLEMENTS CONTROLLERS (PRESERVED FOR COMPATIBILITY)
// ==============================================================================

export const getSettlements = async (req, res, next) => {
  try {
    const { sellerId, week, status, startDate, endDate, transactionId, receiptNumber, search, page = 1, limit = 50 } = req.query;

    let query = supabaseA
      .from('seller_settlements')
      .select('*, sellers:seller_id(business_name, owner_name, email, mobile_number, upi_id, phonepay_number, phonepay_no)', { count: 'exact' });

    if (sellerId) query = query.eq('seller_id', sellerId);
    if (status) query = query.eq('status', status.toUpperCase());
    if (week) query = query.eq('week_number', parseInt(week, 10));
    if (transactionId) query = query.eq('transaction_id', transactionId);
    if (receiptNumber) query = query.eq('receipt_number', receiptNumber);
    if (startDate) query = query.gte('start_date', startDate);
    if (endDate) query = query.lte('end_date', endDate);

    const from = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const to = from + parseInt(limit, 10) - 1;
    query = query.order('end_date', { ascending: false }).order('week_number', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    let filteredData = data || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(s => 
        s.sellers?.business_name?.toLowerCase().includes(searchLower) ||
        s.receipt_number?.toLowerCase().includes(searchLower) ||
        s.transaction_id?.toLowerCase().includes(searchLower)
      );
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: count || filteredData.length,
      data: filteredData
    });
  } catch (err) {
    next(err);
  }
};

export const getSellerSettlements = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';
    const currentSellerId = req.sellerId || req.user?.id;

    if (!isSuperAdmin && String(sellerId) !== String(currentSellerId)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Forbidden: You do not have permission to view this merchant\'s settlement financial records.'
      });
    }

    const { data, error } = await supabaseA.rpc('get_or_create_seller_settlements', { p_seller_id: sellerId });
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: data || []
    });
  } catch (err) {
    next(err);
  }
};

export const getSettlementDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: settlement, error: sErr } = await supabaseA
      .from('seller_settlements')
      .select('*, sellers:seller_id(*)')
      .eq('id', id)
      .single();

    if (sErr || !settlement) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Settlement not found' });
    }

    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';
    const currentSellerId = req.sellerId || req.user?.id;

    if (!isSuperAdmin && String(settlement.seller_id) !== String(currentSellerId)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Forbidden: You do not have permission to view this settlement statement.'
      });
    }

    const { data: orders } = await supabaseA
      .from('orders')
      .select('*')
      .eq('seller_id', settlement.seller_id)
      .eq('payment_status', 'COMPLETE')
      .in('order_status', ['delivered', 'completed'])
      .gte('created_at', settlement.start_date)
      .lte('created_at', settlement.end_date);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        settlement,
        orders: orders || []
      }
    });
  } catch (err) {
    next(err);
  }
};

export const paySettlement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transactionId, notes, pdfUrl } = req.body;
    const adminId = req.user?.id;

    if (!transactionId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Transaction ID / UTR is required' });
    }

    const { data: updatedSettlement, error: rpcErr } = await supabaseA.rpc('mark_settlement_as_paid', {
      p_settlement_id: id,
      p_transaction_id: transactionId,
      p_admin_id: adminId || '00000000-0000-0000-0000-000000000000',
      p_notes: notes || '',
      p_ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      p_user_agent: req.headers['user-agent'] || 'Server',
      p_pdf_url: pdfUrl || null
    });

    if (rpcErr) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: rpcErr.message });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Settlement marked as Paid successfully.',
      data: updatedSettlement
    });
  } catch (err) {
    next(err);
  }
};

export const getRevenueSummary = async (req, res, next) => {
  try {
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';
    const currentSellerId = req.sellerId || req.user?.id;
    const targetSellerId = isSuperAdmin ? req.query.sellerId : currentSellerId;
    
    let query = supabaseA.from('seller_revenue_summary').select('*');
    if (targetSellerId) {
      query = query.eq('seller_id', targetSellerId);
    }

    const { data, error } = await query;
    if (error && error.code !== 'PGRST116') {
      console.warn('seller_revenue_summary query warning:', error.message);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: data || []
    });
  } catch (err) {
    next(err);
  }
};

// ==============================================================================
// RAZORPAY ROUTE MARKETPLACE SETTLEMENT CONTROLLERS
// ==============================================================================

/**
 * Robust seller identity resolver from authenticated JWT
 * Never trusts seller_id from client body/query
 */
async function resolveSellerId(req) {
  if (req.sellerId) return req.sellerId;
  const userId = req.user?.id;
  if (!userId) return null;
  const { data: seller } = await supabaseA
    .from('sellers')
    .select('id')
    .or(`user_id.eq.${userId},id.eq.${userId}`)
    .maybeSingle();
  return seller?.id || userId;
}

/**
 * 1. Onboard / Configure Seller for Razorpay Route Settlement (UPI or Bank)
 * POST /api/settlements/route/onboard or /api/v1/seller/settlement/onboarding
 */
export const sellerRouteOnboard = async (req, res, next) => {
  try {
    const sellerId = await resolveSellerId(req);
    if (!sellerId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized seller account' });
    }

    const { data: seller, error: sErr } = await supabaseA
      .from('sellers')
      .select('*')
      .eq('id', sellerId)
      .single();

    if (sErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Seller record not found' });
    }

    const { 
      settlement_method = 'UPI', 
      upi_id, 
      beneficiary_name,
      bank_account,
      business_type = 'individual',
      legal_name
    } = req.body;

    const normalizedMethod = String(settlement_method).toUpperCase();
    if (!['UPI', 'BANK_ACCOUNT'].includes(normalizedMethod)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: 'Invalid settlement method. Supported methods: UPI, BANK_ACCOUNT' 
      });
    }

    if (normalizedMethod === 'UPI') {
      if (!upi_id || !upi_id.includes('@')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: 'A valid UPI ID (e.g. merchant@upi) is required for UPI settlement' 
        });
      }
    } else if (normalizedMethod === 'BANK_ACCOUNT') {
      if (!bank_account?.account_number || !bank_account?.ifsc_code) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: 'Bank account number and IFSC code are required for Bank Account settlement' 
        });
      }
    }

    // Call Razorpay Route Linked Account Onboarding
    const routeRes = await createLinkedAccount(seller, {
      legal_name: legal_name || beneficiary_name || seller.business_name,
      business_type,
      settlement_method: normalizedMethod,
      upi_id: normalizedMethod === 'UPI' ? upi_id : null,
      beneficiary_name: beneficiary_name || seller.business_name,
      bank_account: normalizedMethod === 'BANK_ACCOUNT' ? bank_account : null,
      email: seller.email,
      phone: seller.phone_number || seller.mobile_number
    });

    // Update sellers table with safe metadata only
    const updatePayload = {
      razorpay_account_id: routeRes.accountId,
      route_onboarding_status: routeRes.status || 'PENDING_VERIFICATION',
      route_verification_status: routeRes.verificationStatus || 'UNDER_REVIEW',
      route_settlement_method: normalizedMethod,
      route_upi_id: normalizedMethod === 'UPI' ? upi_id : null,
      route_bank_account: normalizedMethod === 'BANK_ACCOUNT' ? {
        masked_account: `****${String(bank_account.account_number).slice(-4)}`,
        ifsc: bank_account.ifsc_code,
        beneficiary_name: beneficiary_name || seller.business_name
      } : null,
      auto_settlement_enabled: true,
      updated_at: new Date().toISOString()
    };

    const { error: updErr } = await supabaseA
      .from('sellers')
      .update(updatePayload)
      .eq('id', sellerId);

    if (updErr) throw updErr;

    // Log admin/seller audit
    await supabaseA.from('admin_audit_logs').insert({
      admin_id: req.user?.id,
      admin_email: req.user?.email || seller.email,
      action: 'SELLER_ROUTE_ONBOARDED',
      target_seller_id: sellerId,
      new_state: {
        accountId: routeRes.accountId,
        method: normalizedMethod,
        status: updatePayload.route_onboarding_status
      },
      reason: `Seller onboarded to Razorpay Route with ${normalizedMethod}`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'API'
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Razorpay Route linked account configured successfully.',
      data: {
        accountId: routeRes.accountId,
        onboardingStatus: updatePayload.route_onboarding_status,
        verificationStatus: updatePayload.route_verification_status,
        settlementMethod: normalizedMethod,
        isMock: !!routeRes.isMock,
        isFallback: !!routeRes.isFallback
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Fetch Seller Route Financial Summary (Derived from double-entry ledger & overview view)
 * GET /api/settlements/route/summary or /api/v1/seller/finance/summary
 */
export const getSellerRouteSummary = async (req, res, next) => {
  try {
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';
    const sellerId = isSuperAdmin && req.query.sellerId 
      ? req.query.sellerId 
      : await resolveSellerId(req);

    if (!sellerId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized seller account' });
    }

    const { data: summary, error } = await supabaseA
      .from('seller_route_financial_overview')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (error) {
      console.warn('[Route Overview Query Warning]:', error.message);
    }

    // Also get seller's Route setup details
    const { data: seller } = await supabaseA
      .from('sellers')
      .select('id, business_name, razorpay_account_id, route_onboarding_status, route_verification_status, route_settlement_method, route_upi_id, route_bank_account, settlement_hold_days, auto_settlement_enabled, is_suspended, status')
      .eq('id', sellerId)
      .single();

    const overview = summary || {
      seller_id: sellerId,
      gross_sales_minor: 0,
      platform_commission_minor: 0,
      fixed_fees_minor: 0,
      refund_adjustments_minor: 0,
      eligible_settlement_minor: 0,
      pending_settlement_minor: 0,
      settled_amount_minor: 0,
      reserved_balance_minor: 0,
      net_earnings_minor: 0,
      available_balance_minor: 0
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        ...overview,
        // Minor units (paise)
        currency: 'INR',
        // Rupee formatting for display
        gross_sales: Number((Number(overview.gross_sales_minor || 0) / 100).toFixed(2)),
        platform_commission: Number((Number(overview.platform_commission_minor || 0) / 100).toFixed(2)),
        fixed_fees: Number((Number(overview.fixed_fees_minor || 0) / 100).toFixed(2)),
        refund_adjustments: Number((Number(overview.refund_adjustments_minor || 0) / 100).toFixed(2)),
        eligible_settlement: Number((Number(overview.eligible_settlement_minor || 0) / 100).toFixed(2)),
        pending_settlement: Number((Number(overview.pending_settlement_minor || 0) / 100).toFixed(2)),
        settled_amount: Number((Number(overview.settled_amount_minor || 0) / 100).toFixed(2)),
        reserved_balance: Number((Number(overview.reserved_balance_minor || 0) / 100).toFixed(2)),
        net_earnings: Number((Number(overview.net_earnings_minor || 0) / 100).toFixed(2)),
        available_balance: Number((Number(overview.available_balance_minor || 0) / 100).toFixed(2)),
        sellerConfig: seller || null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Fetch Seller Route Batches History
 * GET /api/settlements/route/batches or /api/v1/seller/settlements
 */
export const getSellerRouteBatches = async (req, res, next) => {
  try {
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';
    const sellerId = isSuperAdmin && req.query.sellerId 
      ? req.query.sellerId 
      : await resolveSellerId(req);

    if (!sellerId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized seller account' });
    }

    const { status, page = 1, limit = 50 } = req.query;

    let query = supabaseA
      .from('seller_settlements')
      .select('*, settlement_orders(*)', { count: 'exact' })
      .eq('seller_id', sellerId);

    if (status && status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    }

    const from = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const to = from + parseInt(limit, 10) - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: count || data?.length || 0,
      data: data || []
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Fetch Seller Route Financial Ledger (Double-Entry Log)
 * GET /api/settlements/route/ledger or /api/v1/seller/finance/transactions
 */
export const getSellerRouteLedger = async (req, res, next) => {
  try {
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';
    const sellerId = isSuperAdmin && req.query.sellerId 
      ? req.query.sellerId 
      : await resolveSellerId(req);

    if (!sellerId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized seller account' });
    }

    const { type, status, page = 1, limit = 50 } = req.query;

    let query = supabaseA
      .from('seller_financial_ledger')
      .select('*', { count: 'exact' })
      .eq('seller_id', sellerId);

    if (type && type !== 'ALL') {
      query = query.eq('transaction_type', type.toUpperCase());
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    }

    const from = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const to = from + parseInt(limit, 10) - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: count || data?.length || 0,
      data: data || []
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Fetch All Route Settlement Batches (Super Admin)
 * GET /api/settlements/batches or /api/v1/admin/settlements
 */
export const getRouteBatches = async (req, res, next) => {
  try {
    const { status, sellerId, search, page = 1, limit = 50 } = req.query;

    let query = supabaseA
      .from('seller_settlements')
      .select('*, sellers:seller_id(id, business_name, owner_name, email, razorpay_account_id, route_settlement_method, route_upi_id), settlement_orders(*)', { count: 'exact' });

    if (status && status !== 'ALL') {
      query = query.eq('status', status.toUpperCase());
    }
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    const from = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const to = from + parseInt(limit, 10) - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    let filtered = data || [];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b => 
        b.settlement_number?.toLowerCase().includes(q) ||
        b.razorpay_transfer_id?.toLowerCase().includes(q) ||
        b.utr_number?.toLowerCase().includes(q) ||
        b.sellers?.business_name?.toLowerCase().includes(q) ||
        b.sellers?.email?.toLowerCase().includes(q)
      );
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: count || filtered.length,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Super Admin: Place Settlement Batch on Hold
 * POST /api/settlements/batches/:id/hold or /api/v1/admin/settlements/:id/hold
 */
export const adminHoldSettlementBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Placed on hold by Super Admin' } = req.body;
    const adminId = req.user?.id;
    const adminEmail = req.user?.email || 'admin@zebalpha.shop';

    const { data: batch, error: bErr } = await supabaseA
      .from('seller_settlements')
      .select('*')
      .eq('id', id)
      .single();

    if (bErr || !batch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Settlement batch not found' });
    }

    if (['SETTLED', 'COMPLETED'].includes(batch.status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: 'Cannot place a settled batch on hold. Funds have already been transferred.' 
      });
    }

    const oldStatus = batch.status;

    const { data: updated, error: uErr } = await supabaseA
      .from('seller_settlements')
      .update({
        status: 'ON_HOLD',
        hold_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (uErr) throw uErr;

    // Log admin audit
    await supabaseA.from('admin_audit_logs').insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action: 'SETTLEMENT_HOLD',
      target_seller_id: batch.seller_id,
      previous_state: { status: oldStatus },
      new_state: { status: 'ON_HOLD', reason },
      reason: reason,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Admin Dashboard'
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Batch ${batch.settlement_number || id} placed on hold.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Super Admin: Release Settlement Batch from Hold
 * POST /api/settlements/batches/:id/release or /api/v1/admin/settlements/:id/release
 */
export const adminReleaseSettlementBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Released from hold by Super Admin' } = req.body;
    const adminId = req.user?.id;
    const adminEmail = req.user?.email || 'admin@zebalpha.shop';

    const { data: batch, error: bErr } = await supabaseA
      .from('seller_settlements')
      .select('*')
      .eq('id', id)
      .single();

    if (bErr || !batch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Settlement batch not found' });
    }

    if (batch.status !== 'ON_HOLD') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: `Cannot release batch in ${batch.status} state. Only ON_HOLD batches can be released.` 
      });
    }

    const { data: updated, error: uErr } = await supabaseA
      .from('seller_settlements')
      .update({
        status: 'QUEUED',
        hold_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (uErr) throw uErr;

    // Log admin audit
    await supabaseA.from('admin_audit_logs').insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action: 'SETTLEMENT_RELEASE',
      target_seller_id: batch.seller_id,
      previous_state: { status: 'ON_HOLD' },
      new_state: { status: 'QUEUED', reason },
      reason: reason,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Admin Dashboard'
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Batch ${batch.settlement_number || id} released and queued for processing.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. Super Admin: Reconcile Single Settlement Batch against Razorpay Route API
 * POST /api/settlements/batches/:id/reconcile or /api/v1/admin/settlements/:id/reconcile
 */
export const adminReconcileSettlementBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    const adminEmail = req.user?.email || 'admin@zebalpha.shop';

    const { data: batch, error: bErr } = await supabaseA
      .from('seller_settlements')
      .select('*')
      .eq('id', id)
      .single();

    if (bErr || !batch) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Settlement batch not found' });
    }

    let providerTransfer = null;
    if (batch.razorpay_transfer_id) {
      providerTransfer = await getTransferDetails(batch.razorpay_transfer_id);
    }

    let newStatus = batch.status;
    let reconciled = false;

    if (providerTransfer?.success && providerTransfer?.transfer) {
      const pStatus = providerTransfer.transfer.status;
      if (pStatus === 'processed' && batch.status !== 'SETTLED') {
        await supabaseA.rpc('finalize_route_settlement_success', {
          p_settlement_id: batch.id,
          p_transfer_id: batch.razorpay_transfer_id,
          p_utr_number: providerTransfer.transfer.settlement_id || batch.utr_number || 'UTR_RECONCILED',
          p_provider_status: 'processed',
          p_source: 'ADMIN_RECONCILIATION'
        });
        newStatus = 'SETTLED';
        reconciled = true;
      } else if (pStatus === 'failed' && batch.status !== 'FAILED') {
        await supabaseA.from('seller_settlements')
          .update({
            status: 'FAILED',
            failure_reason: providerTransfer.transfer.error?.description || 'Provider reported transfer failure',
            updated_at: new Date().toISOString()
          })
          .eq('id', batch.id);
        newStatus = 'FAILED';
        reconciled = true;
      }
    }

    // Log admin audit
    await supabaseA.from('admin_audit_logs').insert({
      admin_id: adminId,
      admin_email: adminEmail,
      action: 'SETTLEMENT_RECONCILE',
      target_seller_id: batch.seller_id,
      previous_state: { status: batch.status },
      new_state: { status: newStatus, reconciled },
      reason: `Manual Route batch reconciliation check`,
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'Admin Dashboard'
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      batchNumber: batch.settlement_number,
      previousStatus: batch.status,
      currentStatus: newStatus,
      reconciled,
      providerData: providerTransfer?.transfer || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. Super Admin: Trigger On-Demand Automated Settlement Sweep
 * POST /api/settlements/sweep/trigger or /api/v1/admin/settlements/sweep
 */
export const adminTriggerSettlementSweep = async (req, res, next) => {
  try {
    const adminEmail = req.user?.email || 'admin@zebalpha.shop';
    const sweepResult = await processEligibleSettlementBatches(`ADMIN_TRIGGER_${adminEmail}`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Settlement eligibility evaluation and batch sweep executed successfully.',
      data: sweepResult
    });
  } catch (err) {
    next(err);
  }
};

