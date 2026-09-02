import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createNotifyRequest = async (req, res, next) => {
  try {
    const { email, productId } = req.body;
    const { data, error } = await supabaseA.from('notify_requests').insert([{ email, product_id: productId }]).select();
    if (error) throw error;

    res.status(HTTP_STATUS.CREATED).json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
};
