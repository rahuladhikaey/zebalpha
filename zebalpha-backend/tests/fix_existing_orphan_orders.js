import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjpahzstldiatfbutvfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MzQwNiwiZXhwIjoyMTA0MTI5NDA2fQ.cxVZ_pEUu3pKXAyO5RRjLhp4Zusjd8RctWpZkL3rVWs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOrphans() {
  console.log('--- SCANNING FOR ORPHAN ORDERS ---');
  
  // 1. Get primary seller ID
  const { data: primarySeller } = await supabase.from('sellers').select('id, user_id').limit(1).single();
  const targetSellerId = primarySeller?.user_id || primarySeller?.id || "0a49cb22-07ea-40bc-856a-3f64f8826db6";
  console.log('Target Primary Seller ID:', targetSellerId);

  // 2. Fetch orders with null seller_id
  const { data: orphanOrders, error } = await supabase
    .from('orders')
    .select('*')
    .is('seller_id', null);

  console.log(`Found ${orphanOrders?.length || 0} orders with null seller_id`);

  if (orphanOrders && orphanOrders.length > 0) {
    for (const order of orphanOrders) {
      console.log(`Fixing order ${order.order_number} (${order.id})...`);
      
      // Update orders table
      await supabase
        .from('orders')
        .update({ seller_id: targetSellerId })
        .eq('id', order.id);

      // Check if seller_orders record exists
      const { data: existingSO } = await supabase
        .from('seller_orders')
        .select('id')
        .eq('parent_order_id', order.id);

      if (!existingSO || existingSO.length === 0) {
        const sellerOrderNumber = `SO-${Date.now()}-${Math.floor(1000+Math.random()*9000)}`;
        const { data: newSO } = await supabase.from('seller_orders').insert([{
          seller_id: targetSellerId,
          parent_order_id: order.id,
          seller_order_number: sellerOrderNumber,
          total_amount: order.total_amount || 0,
          created_at: order.created_at || new Date().toISOString()
        }]).select().single();

        if (newSO) {
          console.log(`Created seller_orders record ${newSO.id} for order ${order.order_number}`);
          
          // Insert shipment record if missing
          const { data: existingShip } = await supabase
            .from('shipments')
            .select('id')
            .eq('parent_order_id', order.id);

          if (!existingShip || existingShip.length === 0) {
            await supabase.from('shipments').insert([{
              parent_order_id: order.id,
              seller_order_id: newSO.id,
              seller_id: targetSellerId,
              status: 'MANIFESTED',
              created_at: order.created_at || new Date().toISOString()
            }]);
          }
        }
      }
    }
  }

  console.log('--- REPAIR COMPLETE ---');
}

fixOrphans();
