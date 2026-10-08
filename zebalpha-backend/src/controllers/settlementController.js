import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { sendSellerStatusEmail } from '../utils/email.js';
import { reconcilePayout, reconcileAllActivePayouts } from '../services/reconciliationService.js';
import { processPayoutQueueBatch, detectAndReconcileStuckPayouts } from '../services/payoutQueueService.js';

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
