import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';

export const getProducts = async (req, res, next) => {
  try {
    const { category, activeOnly, limit } = req.query;
    let query = supabaseA.from('products').select('*, categories(*)').order('id', { ascending: false });

    if (activeOnly === 'true') {
      query = query.eq('is_active', true);
    }
    if (category) {
      query = query.eq('category_id', category);
    }
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseA.from('products').select('*, categories(*)').eq('id', id).single();
    if (error || !data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Product not found' });
    }

    res.status(HTTP_STATUS.OK).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const productPayload = req.body;
    const { data, error } = await supabaseA.from('products').insert([productPayload]).select();
    if (error) throw error;

    const saved = data?.[0] || productPayload;

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body;
    const { data, error } = await supabaseA.from('products').update(updatePayload).eq('id', id).select();
    if (error) throw error;

    const updated = data?.[0] || { id, ...updatePayload };

    res.status(HTTP_STATUS.OK).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseA.from('products').delete().eq('id', id);
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const { data, error } = await supabaseA.from('categories').select('*').order('name', { ascending: true });
    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({ success: true, data });
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

    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};
