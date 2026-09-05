/**
 * ZEB-ALPHA Render Scheduled Cron Job Runner
 * Executes maintenance routines against the production API gateway with cryptographic authentication.
 */

async function runCronJobs() {
  const backendUrl = (process.env.BACKEND_URL || 'https://zebalpha-backend-hlk5.onrender.com').replace(/\/$/, '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('❌ [CRON RUNNER] Error: CRON_SECRET environment variable is missing.');
    process.exit(1);
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cronSecret}`
  };

  console.log(`⏱️ [CRON RUNNER] Starting scheduled tasks against ${backendUrl}...`);

  const tasks = [
    {
      name: 'Purge Expired Sellers (15-day lifecycle)',
      url: `${backendUrl}/api/v1/cron/seller/purge-expired`
    },
    {
      name: 'Auto-Complete Delivered Orders (>7 days)',
      url: `${backendUrl}/api/v1/cron/customer/auto-complete-orders`
    }
  ];

  let hasErrors = false;

  for (const task of tasks) {
    try {
      console.log(`\n▶️ Executing: ${task.name} -> ${task.url}`);
      const res = await fetch(task.url, {
        method: 'POST',
        headers
      });

      const data = await res.json().catch(() => ({ status: res.status }));

      if (res.ok && data.success) {
        console.log(`✅ Success (${res.status}):`, data.message || data);
      } else {
        console.error(`❌ Failed (${res.status}):`, data.message || data);
        hasErrors = true;
      }
    } catch (err) {
      console.error(`❌ Network error while executing ${task.name}:`, err.message);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n⚠️ [CRON RUNNER] One or more tasks encountered an error.');
    process.exit(1);
  }

  console.log('\n🎉 [CRON RUNNER] All scheduled maintenance tasks completed successfully.');
  process.exit(0);
}

runCronJobs();
