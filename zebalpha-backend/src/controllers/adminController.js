import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { sendSellerStatusEmail } from '../utils/email.js';

export const getStoreSettings = async (req, res, next) => {
  try {
    const { key } = req.query;
    let query = supabaseA.from('store_settings').select('*');
    if (key) {
      query = query.eq('key', key).single();
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateStoreSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const { data, error } = await supabaseA.from('store_settings').upsert({ key, value }).select();
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
};

export const getNotifyRequests = async (req, res, next) => {
  try {
    const { data, error } = await supabaseA.from('notify_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const suspendSeller = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Suspension reason is required.' });
    }

    // 1. Fetch seller email and name
    const { data: seller, error: fetchErr } = await supabaseA
      .from('sellers')
      .select('email, full_name, user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Seller not found.' });
    }

    // 2. Update seller status
    const { error: updateErr } = await supabaseA
      .from('sellers')
      .update({
        account_status: 'Suspended',
        status: 'suspended',
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_by: req.user.id,
        suspension_reason: reason.trim()
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // 3. Log to merchant verification logs
    await supabaseA.from('merchant_verification_logs').insert({
      seller_id: id,
      action: 'SUSPEND',
      performed_by: req.user.id,
      notes: reason.trim()
    });

    // 4. Send email notification
    const emailSubject = 'Important Notice: Your ASALISWAD Seller Account has been Suspended';
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #f3f4f6; border-radius: 12px; background-color: #fcfcfc;">
        <h2 style="color: #dc2626;">Account Suspension Notice</h2>
        <p>Dear ${seller.full_name},</p>
        <p>We regret to inform you that your seller account on ASALISWAD has been suspended by the platform administration.</p>
        <div style="padding: 15px; border-left: 4px solid #dc2626; background-color: #fef2f2; margin: 15px 0;">
          <strong>Reason for Suspension:</strong><br/>
          ${reason.trim()}
        </div>
        <p>As a result, your products have been hidden from the storefront, all active login sessions have been invalidated, and dashboard access has been disabled.</p>
        <p>If you believe this is a mistake or wish to appeal this suspension, please contact Super Admin Support.</p>
      </div>
    `;
    await sendSellerStatusEmail(seller.email, emailSubject, emailHtml);

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Seller suspended successfully.' });
  } catch (err) {
    next(err);
  }
};

export const reactivateSeller = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch seller email and name
    const { data: seller, error: fetchErr } = await supabaseA
      .from('sellers')
      .select('email, full_name')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Seller not found.' });
    }

    // 2. Update status back to active
    const { error: updateErr } = await supabaseA
      .from('sellers')
      .update({
        account_status: 'Active',
        status: 'approved',
        is_suspended: false,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // 3. Log to merchant verification logs
    await supabaseA.from('merchant_verification_logs').insert({
      seller_id: id,
      action: 'REACTIVATE',
      performed_by: req.user.id,
      notes: 'Account reactivated by administrator.'
    });

    // 4. Send email notification
    const emailSubject = 'Good News: Your ASALISWAD Seller Account is Reactivated!';
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #f3f4f6; border-radius: 12px; background-color: #fcfcfc;">
        <h2 style="color: #059669;">Account Reactivated</h2>
        <p>Dear ${seller.full_name},</p>
        <p>We are pleased to inform you that your seller account on ASALISWAD has been reactivated by the platform administration.</p>
        <p>Your products are now visible again, and your dashboard access has been restored.</p>
        <p>You can log in and manage your listings immediately.</p>
      </div>
    `;
    await sendSellerStatusEmail(seller.email, emailSubject, emailHtml);

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Seller reactivated successfully.' });
  } catch (err) {
    next(err);
  }
};

export const softDeleteSeller = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Deletion reason is required.' });
    }

    // 1. Check seller
    const { data: seller, error: fetchErr } = await supabaseA
      .from('sellers')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Seller not found.' });
    }

    // 2. Soft delete update
    const { error: updateErr } = await supabaseA
      .from('sellers')
      .update({
        account_status: 'Deleted',
        status: 'deleted',
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: req.user.id,
        deletion_reason: reason.trim()
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // 3. Log to merchant verification logs
    await supabaseA.from('merchant_verification_logs').insert({
      seller_id: id,
      action: 'SOFT_DELETE',
      performed_by: req.user.id,
      notes: reason.trim()
    });

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Seller soft deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

export const permanentDeleteSeller = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { passwordConfirm } = req.body;

    if (!passwordConfirm) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Admin password confirmation is required.' });
    }

    // 1. Verify admin credentials via auth.signInWithPassword
    const adminEmail = req.user.email;
    const { error: authErr } = await supabaseA.auth.signInWithPassword({
      email: adminEmail,
      password: passwordConfirm
    });

    if (authErr) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Authentication failed: Invalid admin password.' });
    }

    // 2. Fetch seller details
    const { data: seller, error: fetchErr } = await supabaseA
      .from('sellers')
      .select('id, user_id, email')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !seller) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Seller not found.' });
    }

    // 3. Fetch product images to delete from Storage
    const { data: productsData } = await supabaseA
      .from('products')
      .select('image_url, images')
      .eq('seller_id', id);

    if (productsData && productsData.length > 0) {
      const filePaths = [];
      productsData.forEach((p) => {
        // Extract filenames from Cloudinary/Supabase URLs
        if (p.image_url && p.image_url.includes('/public/product-images/')) {
          const parts = p.image_url.split('/product-images/');
          if (parts[1]) filePaths.push(parts[1]);
        }
        if (Array.isArray(p.images)) {
          p.images.forEach((img) => {
            if (img && img.includes('/public/product-images/')) {
              const parts = img.split('/product-images/');
              if (parts[1]) filePaths.push(parts[1]);
            }
          });
        }
      });

      if (filePaths.length > 0) {
        try {
          await supabaseA.storage.from('product-images').remove(filePaths);
        } catch (storageErr) {
          console.warn('[Storage Warning] Failed to delete some product files:', storageErr.message);
        }
      }
    }

    // 4. Call transactional deletion RPC function
    const { data: rpcSuccess, error: rpcErr } = await supabaseA.rpc('delete_seller_permanently', { p_seller_id: id });
    if (rpcErr || !rpcSuccess) {
      throw rpcErr || new Error('Transaction execution failed.');
    }

    // 5. Invalidate/Delete user from Supabase Auth admin API to ensure sessions are closed
    try {
      if (seller.user_id) {
        await supabaseA.auth.admin.deleteUser(seller.user_id);
      }
    } catch (authErr) {
      console.warn('[Auth Admin Warning] Failed to delete auth user via admin API (could be already deleted by SQL trigger):', authErr.message);
    }

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Seller account permanently deleted.' });
  } catch (err) {
    next(err);
  }
};
