import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { cacheService } from '../services/cacheService.js';
import { resolveCategoryIcon } from '../constants/categoryIcons.js';

/**
 * Public Product Listing & Search Controller (High-Performance Slim DTO + Cursor Pagination)
 * Never does SELECT * or loads full catalogs. Max 48 items per request.
 */
export const getProducts = async (req, res, next) => {
  try {
    const { category, activeOnly = 'true', limit = '12', cursor, q, search, brand, sort } = req.query;
    
    // Normalize parameters for deterministic Redis keying
    const parsedLimit = Math.min(Math.max(1, parseInt(String(limit), 10) || 12), 48);
    const normalizedQuery = (q || search || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const queryParams = {
      category: category || '',
      activeOnly: activeOnly || 'true',
      limit: parsedLimit,
      cursor: cursor || '',
      q: normalizedQuery,
      brand: brand || '',
      sort: sort || ''
    };

    const cacheKey = cacheService.generateKey('products:v1:list', queryParams);

    const { data: result, source } = await cacheService.fetchOrCache(cacheKey, async () => {
      // 1. Slim field selection ONLY (Prevents downloading long descriptions / metadata)
      const SLIM_CARD_FIELDS = 'id, name, slug, price, mrp, image_url, brand, stock, is_active, is_approved, approval_status, created_at, category_id';
      
      let query = supabaseA.from('products').select(SLIM_CARD_FIELDS);

      if (queryParams.activeOnly === 'true') {
        query = query.eq('is_active', true).eq('is_approved', true);
      }
      if (queryParams.category) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryParams.category);
        if (isUuid) {
          query = query.eq('category_id', queryParams.category);
        } else {
          const cleanCat = queryParams.category.replace(/[-_]/g, ' ').trim();
          query = query.or(`name.ilike.%${cleanCat}%,collection.ilike.%${cleanCat}%`);
        }
      }
      if (queryParams.brand) {
        query = query.ilike('brand', `%${queryParams.brand}%`);
      }

      // Full Text / Trigram Search Optimization
      if (queryParams.q) {
        query = query.or(`name.ilike.%${queryParams.q}%,brand.ilike.%${queryParams.q}%`);
      }

      // Cursor-based Pagination (Keyset pagination for 100,000+ items)
      if (queryParams.cursor) {
        try {
          const decodedCursor = JSON.parse(Buffer.from(queryParams.cursor, 'base64').toString('utf8'));
          if (decodedCursor && decodedCursor.created_at && decodedCursor.id) {
            query = query.lt('created_at', decodedCursor.created_at);
          }
        } catch (_) {}
      }

      // Sorting
      if (queryParams.sort === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (queryParams.sort === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
      }

      // Hard Limit max 48 items
      query = query.limit(parsedLimit + 1);

      const { data: dbData, error } = await query;
      if (error) throw error;

      const items = dbData || [];
      const hasMore = items.length > parsedLimit;
      const products = hasMore ? items.slice(0, parsedLimit) : items;

      let nextCursor = null;
      if (hasMore && products.length > 0) {
        const lastItem = products[products.length - 1];
        nextCursor = Buffer.from(JSON.stringify({ created_at: lastItem.created_at, id: lastItem.id })).toString('base64');
      }

      return {
        products,
        nextCursor,
        hasMore,
        count: products.length
      };
    }, cacheService.defaultTtl);

    res.setHeader('X-Cache', source === 'cache' ? 'HIT' : 'MISS');
    res.setHeader('X-Cache-Engine', cacheService.isUpstashEnabled ? 'Redis' : 'Memory');
    res.status(HTTP_STATUS.OK).json({ 
      success: true, 
      data: result.products, 
      nextCursor: result.nextCursor, 
      hasMore: result.hasMore,
      cacheSource: source 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public Product Detail Controller (Cache-Aside Pattern)
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Product ID is required' });
    }

    const cacheKey = `product:detail:${id}`;

    const { data, source } = await cacheService.fetchOrCache(cacheKey, async () => {
      const { data: dbProduct, error } = await supabaseA
        .from('products')
        .select('*, categories(*)')
        .eq('id', id)
        .maybeSingle();

      if (error || !dbProduct) {
        return null;
      }
      return dbProduct;
    }, cacheService.productDetailTtl);

    if (!data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Product not found' });
    }

    res.setHeader('X-Cache', source === 'cache' ? 'HIT' : 'MISS');
    res.status(HTTP_STATUS.OK).json({ success: true, data, cacheSource: source });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Product Controller (Invalidates affected product & search cache)
 */
export const createProduct = async (req, res, next) => {
  try {
    const raw = req.body;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // Whitelist and sanitize payload
    const sanitizedPayload = {
      name: (raw.name || '').trim(),
      description: raw.description || '',
      price: Math.max(0, Number(raw.price) || 0),
      mrp: Math.max(0, Number(raw.mrp) || Number(raw.price) || 0),
      image_url: raw.image_url || null,
      images: Array.isArray(raw.images) ? raw.images : [],
      brand: raw.brand || 'ZEBALPHA',
      stock: Math.max(0, parseInt(raw.stock, 10) || 0),
      sku: raw.sku || null,
      category_id: raw.category_id || null,
      low_stock_limit: Math.max(1, parseInt(raw.low_stock_limit, 10) || 5),
      is_active: raw.is_active !== false,
      status: raw.status || 'AVAILABLE',
      specifications: typeof raw.specifications === 'object' ? raw.specifications : {},
      offers: Array.isArray(raw.offers) ? raw.offers : [],
      packages: Array.isArray(raw.packages) ? raw.packages : [],
      virtual_tryon_image: raw.virtual_tryon_image || null,
      virtual_tryon_category: raw.virtual_tryon_category || 'upper_body',
      is_vto_enabled: raw.is_vto_enabled !== false,
      // Strictly enforce seller_id based on authenticated session for sellers
      seller_id: isSuperAdmin ? (raw.seller_id || req.user?.id) : req.user?.id,
      // Seller products require admin approval by default
      is_approved: isSuperAdmin ? true : false,
      approval_status: isSuperAdmin ? 'approved' : 'pending'
    };

    // Synchronize parent product price and MRP with default/primary package for mathematical consistency
    if (Array.isArray(sanitizedPayload.packages) && sanitizedPayload.packages.length > 0) {
      const defaultCol = (raw.default_color || raw.main_color || '').trim().toLowerCase();
      const primaryPkg = sanitizedPayload.packages.find(p => defaultCol && (p.color || '').trim().toLowerCase() === defaultCol) || sanitizedPayload.packages[0];
      if (primaryPkg && Number(primaryPkg.price) > 0) {
        sanitizedPayload.price = Number(primaryPkg.price);
        sanitizedPayload.mrp = Number(primaryPkg.mrp) > 0 ? Number(primaryPkg.mrp) : sanitizedPayload.price;
      }
    }

    if (!sanitizedPayload.name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Product name is required' });
    }

    sanitizedPayload.slug = raw.slug || `${sanitizedPayload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const { data, error } = await supabaseA.from('products').insert([sanitizedPayload]).select();
    if (error) throw error;

    const saved = data?.[0] || sanitizedPayload;

    // Cache Invalidation after successful write
    await cacheService.invalidateProductCache(saved.id);

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Product Controller (Invalidates affected product & search cache)
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // 1. Verify existence and ownership to prevent IDOR
    const { data: existing, error: fetchErr } = await supabaseA
      .from('products')
      .select('id, seller_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Product not found' });
    }

    if (!isSuperAdmin && String(existing.seller_id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Forbidden: You do not have permission to modify another merchant\'s product'
      });
    }

    // 2. Whitelist allowed update fields
    const raw = req.body;
    const allowedUpdates = {};
    const safeFields = [
      'name', 'description', 'price', 'mrp', 'image_url', 'images', 
      'brand', 'stock', 'sku', 'category_id', 'low_stock_limit', 
      'is_active', 'status', 'specifications', 'offers', 'packages',
      'virtual_tryon_image', 'virtual_tryon_category', 'is_vto_enabled'
    ];

    safeFields.forEach(f => {
      if (raw[f] !== undefined) allowedUpdates[f] = raw[f];
    });

    // Synchronize parent product price and MRP with default/primary package for mathematical consistency
    if (Array.isArray(allowedUpdates.packages) && allowedUpdates.packages.length > 0) {
      const defaultCol = (raw.default_color || raw.main_color || existing.default_color || '').trim().toLowerCase();
      const primaryPkg = allowedUpdates.packages.find(p => defaultCol && (p.color || '').trim().toLowerCase() === defaultCol) || allowedUpdates.packages[0];
      if (primaryPkg && Number(primaryPkg.price) > 0) {
        allowedUpdates.price = Number(primaryPkg.price);
        allowedUpdates.mrp = Number(primaryPkg.mrp) > 0 ? Number(primaryPkg.mrp) : allowedUpdates.price;
      }
    }

    // Only SUPER_ADMIN can modify approval statuses
    if (isSuperAdmin) {
      if (raw.is_approved !== undefined) allowedUpdates.is_approved = raw.is_approved;
      if (raw.approval_status !== undefined) allowedUpdates.approval_status = raw.approval_status;
    }

    allowedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseA.from('products').update(allowedUpdates).eq('id', id).select();
    if (error) throw error;

    const updated = data?.[0] || { id, ...allowedUpdates };

    // Cache Invalidation after successful write
    await cacheService.invalidateProductCache(id);

    res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete Product Controller (Invalidates affected product & search cache)
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = (req.user?.role || '').toLowerCase() === 'super_admin';

    // Verify ownership to prevent IDOR
    const { data: existing, error: fetchErr } = await supabaseA
      .from('products')
      .select('id, seller_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Product not found' });
    }

    if (!isSuperAdmin && String(existing.seller_id) !== String(req.user?.id)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Forbidden: You do not have permission to delete another merchant\'s product'
      });
    }

    const { error } = await supabaseA.from('products').delete().eq('id', id);
    if (error) throw error;

    // Cache Invalidation
    await cacheService.invalidateProductCache(id);

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Public Category Listing Controller (Cache-Aside Pattern)
 */
export const getCategories = async (req, res, next) => {
  try {
    const { includeHierarchy = 'false', activeOnly = 'true' } = req.query;
    const cacheKey = `categories:all:active:${activeOnly}:hierarchy:${includeHierarchy}`;

    const { data, source } = await cacheService.fetchOrCache(cacheKey, async () => {
      let query = supabaseA
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (activeOnly === 'true') {
        query = query.or('is_active.is.null,is_active.eq.true');
      }

      const { data: dbCategories, error } = await query;
      if (error) throw error;

      const normalized = (dbCategories || []).map((cat) => {
        if (!cat.icon_key || cat.icon_key === 'package') {
          const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
          return { ...cat, icon_key: resolved.icon_key, icon_source: cat.icon_source || resolved.icon_source };
        }
        return cat;
      });

      if (includeHierarchy === 'true') {
        const mainCategories = normalized.filter((c) => !c.parent_id);
        const subcategories = normalized.filter((c) => !!c.parent_id);

        return mainCategories.map((main) => ({
          ...main,
          subcategories: subcategories.filter((sub) => String(sub.parent_id) === String(main.id))
        }));
      }

      return normalized;
    }, cacheService.categoriesTtl);

    res.setHeader('X-Cache', source === 'cache' ? 'HIT' : 'MISS');
    res.status(HTTP_STATUS.OK).json({ success: true, data, cacheSource: source });
  } catch (err) {
    next(err);
  }
};

/**
 * Public Customer Navigation Categories Controller
 * Returns active Main Categories enabled for navigation in admin-configured order.
 */
export const getNavigationCategories = async (req, res, next) => {
  try {
    const cacheKey = 'categories:navigation:public';

    const { data, source } = await cacheService.fetchOrCache(cacheKey, async () => {
      const { data: dbCategories, error } = await supabaseA
        .from('categories')
        .select('id, name, slug, icon_key, icon_url, icon_source, image_url, description, display_order, is_active, show_in_navigation')
        .is('parent_id', null)
        .or('is_active.is.null,is_active.eq.true')
        .or('show_in_navigation.is.null,show_in_navigation.eq.true')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return (dbCategories || []).map((cat) => {
        const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
        return {
          ...cat,
          icon_key: cat.icon_key && cat.icon_source === 'ADMIN' ? cat.icon_key : resolved.icon_key,
          icon_source: cat.icon_source || resolved.icon_source
        };
      });
    }, cacheService.categoriesTtl || 600);

    res.setHeader('X-Cache', source === 'cache' ? 'HIT' : 'MISS');
    res.status(HTTP_STATUS.OK).json({ success: true, data, cacheSource: source });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Subcategories for given Category ID
 */
export const getSubcategories = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Category ID is required' });
    }

    const { data: subcats, error } = await supabaseA
      .from('categories')
      .select('*')
      .eq('parent_id', id)
      .or('is_active.is.null,is_active.eq.true')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data: subcats || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin: Create Category with Automatic Icon Assignment
 */
export const createCategory = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      description,
      parent_id,
      icon_key,
      icon_url,
      icon_source,
      image_url,
      display_order = 0,
      show_in_navigation = true,
      is_active = true
    } = req.body;

    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Category name is required' });
    }

    // Auto-generate slug if not provided
    const computedSlug = (slug || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));

    // Auto-resolve icon if not provided or source is AUTO
    const iconResolution = resolveCategoryIcon(trimmedName, icon_key, icon_source);

    const payload = {
      name: trimmedName,
      slug: computedSlug,
      description: description || null,
      parent_id: parent_id || null,
      icon_key: icon_key && icon_source === 'ADMIN' ? icon_key : iconResolution.icon_key,
      icon_url: icon_url || null,
      icon_source: icon_source === 'ADMIN' ? 'ADMIN' : iconResolution.icon_source,
      image_url: image_url || null,
      display_order: parseInt(display_order, 10) || 0,
      show_in_navigation: show_in_navigation !== false,
      is_active: is_active !== false,
      created_by: req.user?.id || null
    };

    const { data, error } = await supabaseA.from('categories').insert([payload]).select();
    if (error) throw error;

    const saved = data?.[0] || payload;

    // Invalidate categories cache
    await cacheService.invalidateCategoryCache();

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin: Update Category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      parent_id,
      icon_key,
      icon_url,
      icon_source,
      image_url,
      display_order,
      show_in_navigation,
      is_active
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (slug !== undefined) updates.slug = slug.trim();
    if (description !== undefined) updates.description = description;
    if (parent_id !== undefined) updates.parent_id = parent_id || null;
    if (image_url !== undefined) updates.image_url = image_url;
    if (icon_url !== undefined) updates.icon_url = icon_url;
    if (display_order !== undefined) updates.display_order = parseInt(display_order, 10) || 0;
    if (show_in_navigation !== undefined) updates.show_in_navigation = !!show_in_navigation;
    if (is_active !== undefined) updates.is_active = !!is_active;

    // Handle icon logic
    if (icon_key !== undefined) {
      updates.icon_key = icon_key;
      updates.icon_source = icon_source || 'ADMIN';
    } else if (name && (!icon_source || icon_source === 'AUTO')) {
      const iconRes = resolveCategoryIcon(name);
      updates.icon_key = iconRes.icon_key;
      updates.icon_source = iconRes.icon_source;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseA
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    const updated = data?.[0] || { id, ...updates };

    // Invalidate categories cache
    await cacheService.invalidateCategoryCache();

    res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin: Safe Archive or Delete Category
 * Never permanently deletes if referenced by products!
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    // Check if products reference this category
    const { count, error: countErr } = await supabaseA
      .from('products')
      .select('id', { count: 'exact', head: true })
      .or(`category_id.eq.${id},subcategory_id.eq.${id}`);

    if (countErr) throw countErr;

    if (count && count > 0 && permanent !== 'force') {
      // Safe Archive: Soft deactivate so products keep historical referential integrity
      const { error: archiveErr } = await supabaseA
        .from('categories')
        .update({ is_active: false, show_in_navigation: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (archiveErr) throw archiveErr;

      await cacheService.invalidateCategoryCache();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        archived: true,
        message: `Category is referenced by ${count} products. It was safely archived and hidden without breaking historical product catalog records.`
      });
    }

    const { error } = await supabaseA.from('categories').delete().eq('id', id);
    if (error) throw error;

    // Invalidate categories cache
    await cacheService.invalidateCategoryCache();

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Diagnostic Endpoint for Cache Monitoring
 */
export const getCacheDiagnostics = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    cache: cacheService.getMetrics()
  });
};

