import { supabaseB } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Seller Registration (No GST required)
 * Payload: fullName, phone, email, upiId, pickupLocation, category (Grocery/Snacks/Bakery), password
 */
export const registerSeller = async (req, res, next) => {
  try {
    const { fullName, phone, email, upiId, pickupLocation, category, password } = req.body;

    if (!fullName || !phone || !pickupLocation || !category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Full Name, Phone Number, Pickup Location, and Category are required.'
      });
    }

    const validCategories = ['Grocery', 'Snacks', 'Bakery'];
    const formattedCategory = validCategories.find(c => c.toLowerCase() === category.toLowerCase()) || 'Grocery';

    const sellerId = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;

    const sellerPayload = {
      seller_id: sellerId,
      full_name: fullName,
      owner_name: fullName,
      business_name: `${fullName} Store`,
      phone_number: phone,
      mobile_number: phone,
      email: email || `${phone}@seller.asaliswad.com`,
      upi_id: upiId || null,
      phonepay_no: upiId || null,
      pickup_location: pickupLocation,
      city: pickupLocation,
      category: formattedCategory,
      status: 'approved',
      account_status: 'Active',
      delete_requested: false,
      created_at: new Date().toISOString()
    };

    const { data: seller, error } = await supabaseB.from('sellers').insert([sellerPayload]).select();
    if (error) throw error;

    // Save default pickup location
    await supabaseB.from('seller_pickup_locations').insert([{
      seller_id: seller[0].id,
      name: `${fullName} Warehouse`,
      location_name: pickupLocation,
      phone: phone,
      email: email || `${phone}@seller.asaliswad.com`,
      address: pickupLocation,
      city: pickupLocation,
      state: 'Default State',
      pincode: '000000',
      is_default: true
    }]);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Seller account registered and verified successfully.',
      data: seller[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Request 15-Day Account Deletion
 */
export const requestAccountDeletion = async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Seller ID is required.' });
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
 * Restore Seller Account during 15-day Grace Period
 */
export const restoreAccount = async (req, res, next) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Seller ID is required.' });
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
 * Preserves completed orders for financial accounting and reporting.
 */
export const purgeExpiredDeletions = async (req, res, next) => {
  try {
    const nowIso = new Date().toISOString();

    // Fetch sellers whose 15-day countdown has elapsed
    const { data: expiredSellers } = await supabaseB
      .from('sellers')
      .select('id, full_name')
      .eq('delete_requested', true)
      .lte('delete_date', nowIso);

    if (!expiredSellers || expiredSellers.length === 0) {
      return res.status(HTTP_STATUS.OK).json({ success: true, message: 'No expired seller accounts pending purge.' });
    }

    for (const seller of expiredSellers) {
      // 1. Delete seller products from Supabase B
      await supabaseB.from('products').delete().eq('seller_id', seller.id);
      // 2. Delete inventory records
      await supabaseB.from('inventory').delete().eq('seller_id', seller.id);
      // 3. Delete pickup locations
      await supabaseB.from('seller_pickup_locations').delete().eq('seller_id', seller.id);
      // 4. Delete seller record
      await supabaseB.from('sellers').delete().eq('id', seller.id);
      // Note: Past completed orders in `orders` remain intact for audit/reporting!
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Purged ${expiredSellers.length} expired seller account(s) while retaining historical order accounting records.`,
      purgedSellers: expiredSellers.map(s => s.full_name)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch Seller Pickup Locations
 */
export const getPickupLocations = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const { data, error } = await supabaseB.from('seller_pickup_locations').select('*').eq('seller_id', sellerId);
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Support Ticket
 */
export const createSupportTicket = async (req, res, next) => {
  try {
    const ticketPayload = req.body;
    const { data, error } = await supabaseB.from('seller_support_tickets').insert([ticketPayload]).select();
    if (error) throw error;

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Seller Inventory
 */
export const updateSellerInventory = async (req, res, next) => {
  try {
    const { sellerId, productId, stockCount, imageUrl } = req.body;
    const inventoryPayload = {
      seller_id: sellerId,
      product_id: productId,
      stock_count: stockCount,
      image_url: imageUrl,
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
