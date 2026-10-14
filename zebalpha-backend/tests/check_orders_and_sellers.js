import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qjpahzstldiatfbutvfc.supabase.co';
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_A_SERVICE_ROLE_KEY || '').trim();

if (!supabaseKey) {
  console.error('[Security Error] SUPABASE_SERVICE_ROLE_KEY is required in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: products } = await supabase.from('products').select('id, name, seller_id').limit(10);
  console.log('--- PRODUCTS SAMPLE ---');
  console.log(JSON.stringify(products, null, 2));

  const { data: sellers } = await supabase.from('sellers').select('id, user_id, store_name').limit(10);
  console.log('--- SELLERS SAMPLE ---');
  console.log(JSON.stringify(sellers, null, 2));

  const { data: recentOrders } = await supabase.from('orders').select('id, order_number, seller_id, created_at').order('created_at', { ascending: false }).limit(5);
  console.log('--- RECENT ORDERS ---');
  console.log(JSON.stringify(recentOrders, null, 2));

  const { data: recentSellerOrders } = await supabase.from('seller_orders').select('id, seller_id, parent_order_id, created_at').order('created_at', { ascending: false }).limit(5);
  console.log('--- RECENT SELLER ORDERS ---');
  console.log(JSON.stringify(recentSellerOrders, null, 2));
}

check();
