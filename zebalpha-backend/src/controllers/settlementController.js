import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { sendSellerStatusEmail } from '../utils/email.js';

/**
 * Fetch all settlements (Admin Only) with server-side filters
 */
export const getSettlements = async (req, res, next) => {
  try {
    const { sellerId, week, status, startDate, endDate, transactionId, receiptNumber, search, page = 1, limit = 50 } = req.query;

    let query = supabaseA
      .from('seller_settlements')
      .select('*, sellers:seller_id(business_name, owner_name, email, mobile_number, phonepay_number, phonepay_no)', { count: 'exact' });

    // Apply filters
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    if (week) {
      query = query.eq('week_number', parseInt(week, 10));
    }
    if (transactionId) {
      query = query.eq('transaction_id', transactionId);
    }
    if (receiptNumber) {
      query = query.eq('receipt_number', receiptNumber);
    }
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('end_date', endDate);
    }

    // Pagination
    const from = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const to = from + parseInt(limit, 10) - 1;
    query = query.order('end_date', { ascending: false }).order('week_number', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    let filteredData = data || [];

    // Search filter (client-side matching on business name if search is provided)
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

/**
 * Fetch settlements for a specific seller (reconciles on the fly)
 */
export const getSellerSettlements = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    // Call RPC to reconcile and generate any missing weeks in real-time
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

/**
 * Fetch detailed view of a single settlement including orders and commission breakdown
 */
export const getSettlementDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch settlement details
    const { data: settlement, error: sErr } = await supabaseA
      .from('seller_settlements')
      .select('*, sellers:seller_id(*)')
      .eq('id', id)
      .single();

    if (sErr || !settlement) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Settlement not found' });
    }

    // Fetch orders associated with this week's settlement
    // Orders in that date range for this seller
    const { data: orders, error: oErr } = await supabaseA
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

/**
 * Mark settlement as Paid, lock it, generate receipt and send email
 */
export const paySettlement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { transactionId, notes, pdfUrl } = req.body;
    const adminId = req.user?.id;

    if (!transactionId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'PhonePe Transaction ID is required' });
    }

    // Call PostgreSQL RPC to run transactional mark as paid
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

    // Fetch seller email details
    const { data: seller } = await supabaseA
      .from('sellers')
      .select('email, business_name, owner_name')
      .eq('id', updatedSettlement.seller_id)
      .single();

    if (seller?.email) {
      const emailSubject = `💰 Settlement Paid: Week ${updatedSettlement.week_number} - ${seller.business_name}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669; text-align: center;">ASALISWAD Marketplace</h2>
          <h3 style="text-align: center; color: #1e293b;">Settlement Paid successfully!</h3>
          <p>Dear ${seller.owner_name || seller.business_name},</p>
          <p>We are pleased to inform you that your weekly settlement for Week ${updatedSettlement.week_number} has been processed and paid to your PhonePe UPI.</p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Receipt Number:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #1e293b;">${updatedSettlement.receipt_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Settlement Period:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #1e293b;">${new Date(updatedSettlement.start_date).toLocaleDateString()} - ${new Date(updatedSettlement.end_date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Total Orders:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #1e293b;">${updatedSettlement.total_orders}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Gross Sales:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #1e293b;">₹${updatedSettlement.gross_sales}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Platform Commission:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #dc2626;">- ₹${updatedSettlement.commission_deducted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Platform Fees:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #dc2626;">- ₹${updatedSettlement.platform_fees}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Taxes:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #dc2626;">- ₹${updatedSettlement.taxes}</td>
            </tr>
            <tr style="border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; font-weight: bold; font-size: 16px;">
              <td style="padding: 12px 0; color: #1e293b;">Net Settlement Amount:</td>
              <td style="padding: 12px 0; text-align: right; color: #059669;">₹${updatedSettlement.net_amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>PhonePe Transaction ID:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #1e293b;"><code>${updatedSettlement.transaction_id}</code></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Payment Date:</strong></td>
              <td style="padding: 8px 0; text-align: right; color: #1e293b;">${new Date(updatedSettlement.payment_date).toLocaleString()}</td>
            </tr>
          </table>
          
          ${pdfUrl ? `<p style="margin-top: 20px;">You can view and download your PDF receipt from: <a href="${pdfUrl}" target="_blank" style="color: #059669; text-decoration: none;">Download Settlement Receipt</a></p>` : ''}
          
          <div style="margin-top: 30px; padding: 15px; background-color: #f8fafc; border-radius: 6px; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 8px 0; font-weight: bold;">Support Details:</p>
            <p style="margin: 0;">If you have any questions or require support, please contact us at <a href="mailto:support@zebalpha.com" style="color: #059669; text-decoration: none;">support@zebalpha.com</a>.</p>
          </div>
        </div>
      `;
      
      await sendSellerStatusEmail(seller.email, emailSubject, emailHtml, pdfUrl, `settlement_receipt_${updatedSettlement.receipt_number}.pdf`);
      
      // Update email status
      await supabaseA
        .from('seller_settlements')
        .update({ email_sent: true })
        .eq('id', id);
        
      updatedSettlement.email_sent = true;
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

/**
 * Fetch Revenue summary analytics for admin or seller with separated Premium and Standard streams
 */
export const getRevenueSummary = async (req, res, next) => {
  try {
    const { sellerId } = req.query;
    
    let query = supabaseA.from('seller_revenue_summary').select('*');
    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    const { data, error } = await query;
    if (error && error.code !== 'PGRST116') {
      console.warn("seller_revenue_summary query warning:", error.message);
    }

    // Dynamic stream calculation from orders
    let ordersQuery = supabaseA
      .from('orders')
      .select('id, seller_id, total_amount, product_details, order_status, payment_status, created_at')
      .neq('order_status', 'CANCELLED')
      .neq('order_status', 'RETURNED');

    if (sellerId) {
      ordersQuery = ordersQuery.eq('seller_id', sellerId);
    }

    const { data: ordersData } = await ordersQuery;
    const orders = ordersData || [];

    let totalGross = 0;
    let premiumRevenue = 0;
    let standardRevenue = 0;
    let premiumOrdersCount = 0;
    let standardOrdersCount = 0;

    orders.forEach(o => {
      totalGross += Number(o.total_amount) || 0;
      let hasPremium = false;
      let oPrem = 0;
      let oStd = 0;
      try {
        const items = typeof o.product_details === 'string' ? JSON.parse(o.product_details) : o.product_details;
        if (Array.isArray(items) && items.length > 0) {
          items.forEach(item => {
            const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            const isPrem = item.is_premium === true || item.tier === 'PREMIUM' || 
              (item.name || item.product_name || '').toLowerCase().includes('premium') ||
              (item.name || item.product_name || '').toLowerCase().includes('supima') ||
              (item.name || item.product_name || '').toLowerCase().includes('luxe');
            if (isPrem) {
              oPrem += itemTotal;
              hasPremium = true;
            } else {
              oStd += itemTotal;
            }
          });
        } else {
          oStd = Number(o.total_amount) || 0;
        }
      } catch {
        oStd = Number(o.total_amount) || 0;
      }
      if (oPrem === 0 && oStd === 0) oStd = Number(o.total_amount) || 0;
      premiumRevenue += oPrem;
      standardRevenue += oStd;
      if (hasPremium) premiumOrdersCount++;
      else standardOrdersCount++;
    });

    const premiumPercentage = totalGross > 0 ? Math.round((premiumRevenue / totalGross) * 100) : 0;
    const standardPercentage = 100 - premiumPercentage;

    if (sellerId) {
      const baseData = data?.[0] || {};
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          ...baseData,
          totalRevenue: totalGross || Number(baseData.lifetime_revenue) || 0,
          premiumRevenue,
          standardRevenue,
          premiumPercentage,
          standardPercentage,
          premiumOrdersCount,
          standardOrdersCount,
        }
      });
    }

    // Admin total summary aggregation
    const summary = {
      todayRevenue: data?.reduce((s, r) => s + Number(r.today_revenue), 0) || 0,
      yesterdayRevenue: data?.reduce((s, r) => s + Number(r.yesterday_revenue), 0) || 0,
      thisWeekRevenue: data?.reduce((s, r) => s + Number(r.this_week_revenue), 0) || 0,
      lastWeekRevenue: data?.reduce((s, r) => s + Number(r.last_week_revenue), 0) || 0,
      thisMonthRevenue: data?.reduce((s, r) => s + Number(r.this_month_revenue), 0) || 0,
      lastMonthRevenue: data?.reduce((s, r) => s + Number(r.last_month_revenue), 0) || 0,
      thisYearRevenue: data?.reduce((s, r) => s + Number(r.this_year_revenue), 0) || 0,
      lifetimeRevenue: totalGross || (data?.reduce((s, r) => s + Number(r.lifetime_revenue), 0) || 0),
      premiumRevenue,
      standardRevenue,
      premiumPercentage,
      standardPercentage,
      premiumOrdersCount,
      standardOrdersCount,
      pendingSettlement: data?.reduce((s, r) => s + Number(r.pending_settlement), 0) || 0,
      paidSettlement: data?.reduce((s, r) => s + Number(r.paid_settlement), 0) || 0,
      availableBalance: data?.reduce((s, r) => s + Number(r.available_balance), 0) || 0,
      ordersToday: data?.reduce((s, r) => s + Number(r.orders_today), 0) || 0,
      ordersThisWeek: data?.reduce((s, r) => s + Number(r.orders_this_week), 0) || 0,
      ordersThisMonth: data?.reduce((s, r) => s + Number(r.orders_this_month), 0) || 0,
      ordersThisYear: data?.reduce((s, r) => s + Number(r.orders_this_year), 0) || 0,
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};
