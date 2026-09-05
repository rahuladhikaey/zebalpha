import { supabaseB } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Seller Registration (Enterprise Zero-Trust)
 * Newly registered sellers enter 'pending' state awaiting Admin approval.
 */
export const registerSeller = async (req, res, next) => {
  try {
    const { fullName, phone, email, upiId, pickupLocation, category } = req.body;

    if (!fullName || !phone || !pickupLocation || !category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Full Name, Phone Number, Pickup Location, and Category are required.'
      });
    }

    const validCategories = ['Grocery', 'Snacks', 'Bakery', 'Clothing', 'Fashion', 'Apparel'];
    const formattedCategory = validCategories.find(c => c.toLowerCase() === category.toLowerCase()) || 'Clothing';

    const sellerCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
    const authenticatedUserId = req.user?.id || null;

    const sellerPayload = {
      user_id: authenticatedUserId,
      seller_id: sellerCode,
      full_name: fullName.trim(),
      owner_name: fullName.trim(),
      business_name: `${fullName.trim()} Store`,
      phone_number: phone.trim(),
      mobile_number: phone.trim(),
      email: (email || `${phone}@seller.zebalpha.com`).trim().toLowerCase(),
      upi_id: upiId ? upiId.trim() : null,
      phonepay_no: upiId ? upiId.trim() : null,
      pickup_location: pickupLocation.trim(),
      city: pickupLocation.trim(),
      category: formattedCategory,
      business_category: formattedCategory,
      // Zero-Trust: Require admin approval before active seller operations
      status: 'pending',
      account_status: 'Pending Approval',
      delete_requested: false,
      created_at: new Date().toISOString()
    };

    const { data: seller, error } = await supabaseB.from('sellers').insert([sellerPayload]).select();
    if (error) throw error;

    // Save default pickup location
    await supabaseB.from('seller_pickup_locations').insert([{
      seller_id: seller[0].id,
      name: `${fullName.trim()} Warehouse`,
      location_name: pickupLocation.trim(),
      phone: phone.trim(),
      email: (email || `${phone}@seller.zebalpha.com`).trim().toLowerCase(),
      address: pickupLocation.trim(),
      city: pickupLocation.trim(),
      state: 'Default State',
      pincode: '000000',
      is_default: true
    }]);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Seller account registered successfully. Pending Administrator verification.',
      data: seller[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Request 15-Day Account Deletion (IDOR Protected)
 */
export const requestAccountDeletion = async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Seller ID is required.' });
    }

    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // Verify ownership
    const { data: seller, error: fetchErr } = await supabaseB
      .from('sellers')
      .select('id, user_id')
      .eq('id', sellerId)
      .maybeSingle();

    if (fetchErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Seller record not found.' });
    }

    if (!isSuperAdmin && String(seller.user_id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: You can only request deletion for your own seller account.'
      });
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 15);

    const { data, error } = await supabaseB
      .from('sellers')
      .update({
        account_status: 'Pending Deletion',
        delete_requested: true,
        delete_date: targetDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sellerId)
      .select();

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Account deletion requested. Your account will be purged in 15 days. You can restore it anytime before then.',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Restore Seller Account during 15-day Grace Period (IDOR Protected)
 */
export const restoreAccount = async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Seller ID is required.' });
    }

    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // Verify ownership
    const { data: seller, error: fetchErr } = await supabaseB
      .from('sellers')
      .select('id, user_id')
      .eq('id', sellerId)
      .maybeSingle();

    if (fetchErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Seller record not found.' });
    }

    if (!isSuperAdmin && String(seller.user_id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: You can only restore your own seller account.'
      });
    }

    const { data, error } = await supabaseB
      .from('sellers')
      .update({
        account_status: 'Active',
        status: 'approved',
        delete_requested: false,
        delete_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', sellerId)
      .select();

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Seller account successfully restored to Active status.',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Automated Cron Purge for expired seller accounts (Post 15 days)
 * Requires Super Admin authorization or verified CRON_SECRET.
 */
export const purgeExpiredDeletions = async (req, res, next) => {
  try {
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers['authorization'] || req.headers['x-cron-secret'];
    const isSecretValid = cronSecret && (providedSecret === cronSecret || providedSecret === `Bearer ${cronSecret}`);

    if (!isSuperAdmin && !isSecretValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Unauthorized access to seller purge maintenance service.'
      });
    }

    const nowIso = new Date().toISOString();

    const { data: expiredSellers } = await supabaseB
      .from('sellers')
      .select('id, full_name')
      .eq('delete_requested', true)
      .lte('delete_date', nowIso);

    if (!expiredSellers || expiredSellers.length === 0) {
      return res.status(HTTP_STATUS.OK).json({ success: true, message: 'No expired seller accounts pending purge.' });
    }

    for (const seller of expiredSellers) {
      await supabaseB.from('products').delete().eq('seller_id', seller.id);
      await supabaseB.from('inventory').delete().eq('seller_id', seller.id);
      await supabaseB.from('seller_pickup_locations').delete().eq('seller_id', seller.id);
      await supabaseB.from('sellers').delete().eq('id', seller.id);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Purged ${expiredSellers.length} expired seller account(s) securely.`,
      purgedSellers: expiredSellers.map(s => s.full_name)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Seller Pickup Locations (IDOR Protected)
 */
export const getPickupLocations = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    const { data: seller } = await supabaseB
      .from('sellers')
      .select('id, user_id')
      .eq('id', sellerId)
      .maybeSingle();

    if (!seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Seller not found.' });
    }

    if (!isSuperAdmin && String(seller.user_id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: Access denied to other merchant pickup locations.'
      });
    }

    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .select('*')
      .eq('seller_id', sellerId);

    if (error) throw error;
    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Support Ticket (IDOR Protected)
 */
export const createSupportTicket = async (req, res, next) => {
  try {
    const { subject, description, priority = 'medium', category = 'general' } = req.body;
    
    if (!subject || !description) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Subject and description are required.'
      });
    }

    // Resolve seller ID for the authenticated user
    const { data: seller } = await supabaseB
      .from('sellers')
      .select('id')
      .eq('user_id', req.user?.id)
      .maybeSingle();

    const sellerId = seller?.id || req.user?.id;

    const ticketPayload = {
      seller_id: sellerId,
      subject: String(subject).trim().slice(0, 255),
      description: String(description).trim(),
      category: String(category).trim().slice(0, 50),
      priority: ['low', 'medium', 'high', 'urgent'].includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium',
      status: 'open',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseB.from('seller_support_tickets').insert([ticketPayload]).select();
    if (error) throw error;

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Seller Inventory (IDOR Protected)
 */
export const updateSellerInventory = async (req, res, next) => {
  try {
    const { productId, stockCount, imageUrl } = req.body;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // Verify product ownership
    const { data: product } = await supabaseB
      .from('products')
      .select('id, seller_id')
      .eq('id', productId)
      .maybeSingle();

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Product not found.' });
    }

    if (!isSuperAdmin && String(product.seller_id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: You cannot modify inventory for another seller.'
      });
    }

    const inventoryPayload = {
      seller_id: product.seller_id,
      product_id: productId,
      stock_count: Math.max(0, parseInt(stockCount, 10) || 0),
      image_url: imageUrl || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseB
      .from('inventory')
      .upsert([inventoryPayload])
      .select();

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
};
