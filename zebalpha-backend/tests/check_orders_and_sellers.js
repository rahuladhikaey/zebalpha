import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjpahzstldiatfbutvfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MzQwNiwiZXhwIjoyMTA0MTI5NDA2fQ.cxVZ_pEUu3pKXAyO5RRjLhp4Zusjd8RctWpZkL3rVWs';

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
