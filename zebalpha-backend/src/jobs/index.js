import cron from 'node-cron';
import { purgeExpiredDeletions } from '../controllers/sellerController.js';
import { supabaseA, supabaseB } from '../lib/supabase.js';

/**
 * Auto-complete orders that have been marked as 'delivered' for more than 7 days
 */
export const autoCompleteDeliveredOrders = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // 1. Update in Supabase A (Customer Orders)
    const { data: updatedA, error: errA } = await supabaseA
      .from('orders')
      .update({ order_status: 'completed', updated_at: new Date().toISOString() })
      .eq('order_status', 'delivered')
      .lte('updated_at', sevenDaysAgo)
      .select();

    if (errA) console.error('❌ [CRON] Error auto-completing orders in Supabase A:', errA);

    // 2. Update in Supabase B (Seller Orders)
    const { data: updatedB, error: errB } = await supabaseB
      .from('orders')
      .update({ order_status: 'completed', updated_at: new Date().toISOString() })
      .eq('order_status', 'delivered')
      .lte('updated_at', sevenDaysAgo)
      .select();

    if (errB) console.error('❌ [CRON] Error auto-completing orders in Supabase B:', errB);

    console.log(`✅ [CRON] Auto-completed ${updatedA?.length || 0} orders (Customer DB) & ${updatedB?.length || 0} orders (Seller DB).`);
  } catch (error) {
    console.error('❌ [CRON] Failed executing autoCompleteDeliveredOrders:', error);
  }
};

/**
 * Initialize all automated background & cron jobs
 */
export const initCronJobs = () => {
  console.log('⏱️ Initializing ASALISWAD Cron Jobs...');

  // Job 1: Purge expired seller accounts daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Starting Daily Expired Seller Account Purge...');
    try {
      const req = {};
      const res = {
        status: (code) => ({
          json: (data) => console.log(`✅ [CRON] Seller Purge Completed (${code}):`, data)
        })
      };
      const next = (err) => console.error('❌ [CRON] Seller Purge Error:', err);
      
      await purgeExpiredDeletions(req, res, next);
    } catch (error) {
      console.error('❌ [CRON] Failed to execute purgeExpiredDeletions:', error);
    }
  });

  // Job 2: Auto-complete delivered orders older than 7 days daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ [CRON] Starting Auto-Completion of Delivered Orders...');
    await autoCompleteDeliveredOrders();
  });

  // Job 3: Reconcile and pre-generate weekly settlements daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('⏰ [CRON] Starting Daily Seller Settlement Reconciliation...');
    try {
      const { error } = await supabaseA.rpc('get_or_create_all_settlements');
      if (error) throw error;
      console.log('✅ [CRON] Daily Seller Settlement Reconciliation completed successfully.');
    } catch (err) {
      console.error('❌ [CRON] Failed to reconcile seller settlements:', err.message);
    }
  });

  console.log('✅ Cron Jobs Scheduled: [Seller Purge @ 00:00, Order Auto-Completion @ 02:00, Settlement Reconcile @ 03:00]');
};

