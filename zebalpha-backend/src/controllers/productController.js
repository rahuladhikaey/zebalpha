import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { cacheService } from '../services/cacheService.js';

/**
 * Public Product Listing & Search Controller (Cache-Aside Pattern)
 * Checks Redis / Memory cache first, populates on miss.
 */
export const getProducts = async (req, res, next) => {
  try {
    const { category, activeOnly, limit, page, q, search, brand, sort } = req.query;
    const queryParams = {
      category: category || '',
      activeOnly: activeOnly || 'false',
      limit: limit || '',
      page: page || '',
      q: (q || search || '').trim().toLowerCase(),
      brand: brand || '',
      sort: sort || ''
    };

    const cacheKey = cacheService.generateKey('products:list', queryParams);

    const { data, source } = await cacheService.fetchOrCache(cacheKey, async () => {
      let query = supabaseA.from('products').select('*, categories(*)');

      if (queryParams.activeOnly === 'true') {
        query = query.eq('is_active', true);
      }
      if (queryParams.category) {
        query = query.eq('category_id', queryParams.category);
      }
      if (queryParams.brand) {
        query = query.ilike('brand', `%${queryParams.brand}%`);
      }
      if (queryParams.q) {
        query = query.or(`name.ilike.%${queryParams.q}%,description.ilike.%${queryParams.q}%,brand.ilike.%${queryParams.q}%`);
      }

      if (queryParams.sort === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (queryParams.sort === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('id', { ascending: false });
      }

      if (queryParams.limit) {
        const lim = parseInt(queryParams.limit, 10);
        if (queryParams.page) {
          const pg = Math.max(1, parseInt(queryParams.page, 10));
          const from = (pg - 1) * lim;
          const to = from + lim - 1;
          query = query.range(from, to);
        } else {
          query = query.limit(lim);
        }
      }

      const { data: dbData, error } = await query;
      if (error) throw error;
      return dbData || [];
    }, cacheService.defaultTtl);

    res.setHeader('X-Cache', source === 'cache' ? 'HIT' : 'MISS');
    res.setHeader('X-Cache-Engine', cacheService.isUpstashEnabled ? 'Redis' : 'Memory');
    res.status(HTTP_STATUS.OK).json({ success: true, data, cacheSource: source });
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
    const cacheKey = 'categories:all';

    const { data, source } = await cacheService.fetchOrCache(cacheKey, async () => {
      const { data: dbCategories, error } = await supabaseA
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return dbCategories || [];
    }, cacheService.categoriesTtl);

    res.setHeader('X-Cache', source === 'cache' ? 'HIT' : 'MISS');
    res.status(HTTP_STATUS.OK).json({ success: true, data, cacheSource: source });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const { data, error } = await supabaseA.from('categories').insert([{ name: name?.trim() }]).select();
    if (error) throw error;

    const saved = data?.[0] || { name: name?.trim() };

    // Invalidate categories cache
    await cacheService.invalidateCategoryCache();

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { data, error } = await supabaseA.from('categories').update({ name: name?.trim() }).eq('id', id).select();
    if (error) throw error;

    const updated = data?.[0] || { id, name: name?.trim() };

    // Invalidate categories cache
    await cacheService.invalidateCategoryCache();

    res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
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

