import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { cacheService } from '../services/cacheService.js';
import { resolveCategoryIcon } from '../constants/categoryIcons.js';

/**
 * Seller: Submit a new Subcategory proposal under an existing Main Category
 */
export const submitCategoryRequest = async (req, res, next) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized seller' });
    }

    const { parent_category_id, proposed_name, description, reason } = req.body;
    const cleanName = (proposed_name || '').trim();

    if (!parent_category_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Parent Main Category is required' });
    }
    if (!cleanName || cleanName.length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Proposed subcategory name must be at least 2 characters' });
    }

    // 1. Verify parent category exists and is active
    const { data: parentCat, error: parentErr } = await supabaseA
      .from('categories')
      .select('id, name, parent_id, is_active')
      .eq('id', parent_category_id)
      .maybeSingle();

    if (parentErr || !parentCat) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Selected parent category does not exist' });
    }

    const proposedSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // 2. Check if subcategory already exists under this parent
    const { data: existingSubcat } = await supabaseA
      .from('categories')
      .select('id, name')
      .eq('parent_id', parent_category_id)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existingSubcat) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: `Subcategory "${cleanName}" already exists under ${parentCat.name}. You can select it directly.`
      });
    }

    // 3. Check for existing pending request
    const { data: existingPending } = await supabaseA
      .from('category_requests')
      .select('id, status')
      .eq('parent_category_id', parent_category_id)
      .ilike('proposed_name', cleanName)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingPending) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: `A proposal for "${cleanName}" is already pending admin review.`
      });
    }

    const payload = {
      seller_id: sellerId,
      parent_category_id,
      proposed_name: cleanName,
      proposed_slug: proposedSlug,
      description: description?.trim() || null,
      reason: reason?.trim() || null,
      status: 'PENDING'
    };

    const { data, error } = await supabaseA.from('category_requests').insert([payload]).select();
    if (error) throw error;

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: data?.[0] || payload,
      message: 'Subcategory proposal submitted successfully. Pending Admin review.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Seller: View own Subcategory proposals
 */
export const getSellerCategoryRequests = async (req, res, next) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Unauthorized seller' });
    }

    const { data, error } = await supabaseA
      .from('category_requests')
      .select('*, categories:parent_category_id(id, name, slug)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin: View all Subcategory proposals
 */
export const getAdminCategoryRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabaseA
      .from('category_requests')
      .select('*, parent_category:parent_category_id(id, name, slug)')
      .order('created_at', { ascending: false });

    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status.toUpperCase())) {
      query = query.eq('status', status.toUpperCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin: Approve a Subcategory proposal
 * Atomically creates the subcategory in `categories` table and marks request as APPROVED
 */
export const approveCategoryRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const { data: request, error: reqErr } = await supabaseA
      .from('category_requests')
      .select('*, parent_category:parent_category_id(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (reqErr || !request) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Category request not found' });
    }

    if (request.status === 'APPROVED') {
      return res.status(HTTP_STATUS.OK).json({ success: true, message: 'Request is already approved' });
    }

    // Auto-resolve icon for subcategory
    const iconRes = resolveCategoryIcon(request.proposed_name);

    // 1. Insert new subcategory into categories table
    const subcatPayload = {
      name: request.proposed_name,
      slug: request.proposed_slug,
      description: request.description,
      parent_id: request.parent_category_id,
      icon_key: iconRes.icon_key,
      icon_source: iconRes.icon_source,
      display_order: 10,
      show_in_navigation: true,
      is_active: true,
      created_by: request.seller_id
    };

    const { data: createdSubcat, error: createErr } = await supabaseA
      .from('categories')
      .insert([subcatPayload])
      .select();

    if (createErr) throw createErr;

    const newSubcatId = createdSubcat?.[0]?.id;

    // 2. Mark request as APPROVED
    const { error: updateErr } = await supabaseA
      .from('category_requests')
      .update({
        status: 'APPROVED',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        approved_category_id: newSubcatId
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Invalidate categories cache
    await cacheService.invalidateCategoryCache();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Subcategory "${request.proposed_name}" approved and published successfully.`,
      category: createdSubcat?.[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin: Reject a Subcategory proposal
 */
export const rejectCategoryRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const adminId = req.user?.id;

    const { data: request, error: reqErr } = await supabaseA
      .from('category_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (reqErr || !request) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Category request not found' });
    }

    const { error: updateErr } = await supabaseA
      .from('category_requests')
      .update({
        status: 'REJECTED',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason?.trim() || 'Declined by Administrator.'
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Subcategory proposal rejected.'
    });
  } catch (err) {
    next(err);
  }
};
