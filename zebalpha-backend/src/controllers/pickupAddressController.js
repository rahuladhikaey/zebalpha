import { supabaseB, supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { addShiprocketPickupLocation } from '../services/shiprocketService.js';

/**
 * 1. Fetch All Pickup Addresses for a Seller (IDOR Protected)
 */
export const getSellerAddresses = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // Verify seller ownership
    const { data: seller } = await supabaseB
      .from('sellers')
      .select('id, user_id')
      .eq('id', sellerId)
      .maybeSingle();

    if (seller && !isSuperAdmin && String(seller.user_id) !== String(req.user?.id) && String(seller.id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Forbidden: Access denied to other merchant pickup locations.'
      });
    }

    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .select('*')
      .eq('seller_id', sellerId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Create a New Pickup Address (Seller)
 */
export const createSellerAddress = async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const {
      location_name,
      contact_name,
      contact_phone,
      contact_email,
      address_line1,
      address_line2,
      landmark,
      city,
      state,
      pincode,
      is_default = false
    } = req.body;

    if (!address_line1 || !city || !state || !pincode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Address Line 1, City, State, and Pincode are required.'
      });
    }

    // Check if this is the first address, if so make it default
    const { count } = await supabaseB
      .from('seller_pickup_locations')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('is_active', true);

    const makeDefault = is_default || count === 0;

    if (makeDefault) {
      // Clear existing default flags
      await supabaseB
        .from('seller_pickup_locations')
        .update({ is_default: false })
        .eq('seller_id', sellerId);
    }

    const newAddressPayload = {
      seller_id: sellerId,
      user_id: req.user?.id || null,
      location_name: location_name?.trim() || `Hub_${pincode.trim()}`,
      contact_name: contact_name?.trim() || req.user?.full_name || 'Merchant',
      contact_phone: String(contact_phone || req.user?.phone || '9999999999').replace(/\D/g, '').slice(0, 10),
      contact_email: contact_email?.trim() || req.user?.email || 'seller@zebalpha.com',
      address_line1: address_line1.trim(),
      address_line2: address_line2?.trim() || null,
      landmark: landmark?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      is_default: makeDefault,
      is_active: true,
      approval_status: 'approved', // Auto-approve verified address format or await review
      shiprocket_sync_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .insert([newAddressPayload])
      .select();

    if (error) throw error;
    const createdAddress = data[0];

    // Attempt automatic Shiprocket sync in background
    addShiprocketPickupLocation(createdAddress).then(async (syncRes) => {
      if (syncRes.success) {
        await supabaseB
          .from('seller_pickup_locations')
          .update({
            shiprocket_sync_status: 'synced',
            shiprocket_pickup_location_id: syncRes.pickup_location || syncRes.address_id,
            synced_at: new Date().toISOString()
          })
          .eq('id', createdAddress.id);
      } else if (syncRes.error) {
        await supabaseB
          .from('seller_pickup_locations')
          .update({
            shiprocket_sync_status: 'failed',
            sync_error: syncRes.error
          })
          .eq('id', createdAddress.id);
      }
    }).catch(e => console.warn('Background pickup sync notice:', e));

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Pickup address registered successfully.',
      data: createdAddress
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Update an Existing Pickup Address (Ensures Historical Snapshot Immutability)
 */
export const updateSellerAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Fetch existing record
    const { data: existing, error: findErr } = await supabaseB
      .from('seller_pickup_locations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findErr || !existing) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Pickup address not found.' });
    }

    // Save previous state to address_change_history for audit trail
    await supabaseB.from('address_change_history').insert([{
      seller_id: existing.seller_id,
      pickup_location_id: existing.id,
      previous_address: existing,
      new_address: updateData,
      changed_by: req.user?.id || null,
      reason: updateData.change_reason || 'Merchant address update'
    }]);

    const fieldsToUpdate = {
      ...updateData,
      shiprocket_sync_status: 'pending', // Re-sync required on modification
      updated_at: new Date().toISOString()
    };
    delete fieldsToUpdate.id;
    delete fieldsToUpdate.created_at;

    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .update(fieldsToUpdate)
      .eq('id', id)
      .select();

    if (error) throw error;

    // Re-sync with Shiprocket
    addShiprocketPickupLocation(data[0]).then(async (syncRes) => {
      if (syncRes.success) {
        await supabaseB
          .from('seller_pickup_locations')
          .update({
            shiprocket_sync_status: 'synced',
            shiprocket_pickup_location_id: syncRes.pickup_location || syncRes.address_id,
            synced_at: new Date().toISOString()
          })
          .eq('id', id);
      }
    }).catch(e => console.warn('Re-sync notice:', e));

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Pickup address updated successfully.',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Set Address as Default for Seller
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { sellerId, id } = req.params;

    // Clear previous defaults
    await supabaseB
      .from('seller_pickup_locations')
      .update({ is_default: false })
      .eq('seller_id', sellerId);

    // Set new default
    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Default pickup warehouse updated.',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Admin: Fetch All Pickup Addresses with Filters
 */
export const getAllAdminPickupAddresses = async (req, res, next) => {
  try {
    const { status, sync_status } = req.query;

    let query = supabaseB.from('seller_pickup_locations').select('*').order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('approval_status', status);
    }
    if (sync_status && sync_status !== 'all') {
      query = query.eq('shiprocket_sync_status', sync_status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Attach merchant details
    const { data: sellers } = await supabaseB.from('sellers').select('id, business_name, full_name, email, phone_number');
    const sellerMap = new Map((sellers || []).map(s => [String(s.id), s]));

    const enriched = (data || []).map(addr => ({
      ...addr,
      seller: sellerMap.get(String(addr.seller_id)) || null
    }));

    res.status(HTTP_STATUS.OK).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Admin: Approve Pickup Address & Sync to Shiprocket
 */
export const approvePickupAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: addr, error: fetchErr } = await supabaseB
      .from('seller_pickup_locations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !addr) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Pickup address not found.' });
    }

    // Call Shiprocket API to register location
    const syncRes = await addShiprocketPickupLocation(addr);

    const updatePayload = {
      approval_status: 'approved',
      rejection_reason: null,
      approved_by: req.user?.email || 'SuperAdmin',
      approved_at: new Date().toISOString(),
      shiprocket_sync_status: syncRes.success ? 'synced' : 'failed',
      shiprocket_pickup_location_id: syncRes.pickup_location || syncRes.address_id || null,
      sync_error: syncRes.error || null,
      synced_at: syncRes.success ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Pickup location approved ${syncRes.success ? '& synced to Shiprocket successfully!' : 'with pending provider sync.'}`,
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Admin: Reject Pickup Address
 */
export const rejectPickupAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Address verification failed' } = req.body;

    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Pickup address rejected.',
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. Admin / Seller: Retry Shiprocket Location Sync
 */
export const retryShiprocketSync = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: addr, error: fetchErr } = await supabaseB
      .from('seller_pickup_locations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !addr) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Address not found.' });
    }

    const syncRes = await addShiprocketPickupLocation(addr);

    const updatePayload = {
      shiprocket_sync_status: syncRes.success ? 'synced' : 'failed',
      shiprocket_pickup_location_id: syncRes.pickup_location || syncRes.address_id || null,
      sync_error: syncRes.error || null,
      synced_at: syncRes.success ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseB
      .from('seller_pickup_locations')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: syncRes.success,
      message: syncRes.success ? 'Synced to Shiprocket successfully!' : `Sync failed: ${syncRes.error}`,
      data: data[0]
    });
  } catch (err) {
    next(err);
  }
};
