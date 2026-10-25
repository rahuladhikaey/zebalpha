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

    const { parent_category_id, name, proposed_name } = req.body;
    const cleanName = (name || proposed_name || '').trim();

    if (!parent_category_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Parent Main Category is required' });
    }
    if (!cleanName || cleanName.length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Subcategory name must be at least 2 characters' });
    }

    // 1. Verify parent category exists
    const { data: parentCat, error: parentErr } = await supabaseA
      .from('categories')
      .select('id, name, parent_id, is_active, icon_key')
      .eq('id', parent_category_id)
      .maybeSingle();

    if (parentErr || !parentCat) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Selected parent category does not exist' });
    }

    // 2. Check if subcategory already exists under this parent
    const { data: existingSubcat } = await supabaseA
      .from('categories')
      .select('id, name, slug, parent_id, is_active')
      .eq('parent_id', parent_category_id)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existingSubcat) {
      if (!existingSubcat.is_active) {
        await supabaseA.from('categories').update({ is_active: true }).eq('id', existingSubcat.id);
      }
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `Subcategory "${existingSubcat.name}" already exists and has been selected.`,
        category: existingSubcat
      });
    }

    // 3. Generate clean unique slug
    let baseSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `subcat-${Date.now().toString(36)}`;
    let finalSlug = baseSlug;
    const { data: slugMatch } = await supabaseA.from('categories').select('id').eq('slug', finalSlug).maybeSingle();
    if (slugMatch) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // 4. Directly insert active subcategory into categories
    const newCategory = {
      name: cleanName,
      slug: finalSlug,
      parent_id: parent_category_id,
      is_active: true,
      show_in_navigation: true,
      created_by: sellerId,
      icon_key: parentCat.icon_key || 'package',
      icon_source: 'AUTO',
      display_order: 0
    };

    const { data: createdCat, error: insertError } = await supabaseA
      .from('categories')
      .insert([newCategory])
      .select()
      .single();

    if (insertError) throw insertError;

    // 5. Invalidate category cache
    await cacheService.deletePattern('categories:*').catch(() => {});

    // 6. Optional audit log entry in category_requests marked as APPROVED
    try {
      await supabaseA.from('category_requests').insert([{
        seller_id: sellerId,
        parent_category_id,
        proposed_name: cleanName,
        proposed_slug: finalSlug,
        status: 'APPROVED',
        approved_category_id: createdCat.id,
        reviewed_at: new Date().toISOString()
      }]);
    } catch (_) {}

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: createdCat,
      category: createdCat,
      message: `Subcategory "${cleanName}" created successfully!`
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
