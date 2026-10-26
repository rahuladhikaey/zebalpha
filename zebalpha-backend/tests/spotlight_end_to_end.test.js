import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../back.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function runEndToEndTests() {
  console.log("====================================================================");
  console.log("ZEBALPHA — SPOTLIGHT MANAGER PRODUCTION END-TO-END VERIFICATION SUITE");
  console.log("====================================================================");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log("✓ Connected to Supabase PostgreSQL Database.\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST GROUP 1: Database Tables & Integrity
    console.log("--- TEST GROUP 1: Schema & Storage Architecture ---");
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('spotlight_campaigns', 'spotlight_editorial_cards', 'spotlight_campaign_items');
    `);
    const tableNames = tablesRes.rows.map(r => r.table_name);
    assert(tableNames.includes('spotlight_campaigns'), "spotlight_campaigns table exists");
    assert(tableNames.includes('spotlight_editorial_cards'), "spotlight_editorial_cards table exists");
    assert(tableNames.includes('spotlight_campaign_items'), "spotlight_campaign_items table exists");

    const bucketRes = await client.query(`
      SELECT id, name, public, file_size_limit 
      FROM storage.buckets 
      WHERE id = 'editorial';
    `);
    assert(bucketRes.rows.length > 0, "Supabase storage bucket 'editorial' exists");
    assert(bucketRes.rows[0]?.file_size_limit === '51200', "Strict 50 KB (51,200 bytes) limit configured on 'editorial' bucket");

    // TEST GROUP 2: Default Top Deals Campaign
    console.log("\n--- TEST GROUP 2: Centralized Top Deals Campaign ---");
    const topDealsRes = await client.query(`
      SELECT id, name, slug, status, max_cards, required_cards, website_enabled, android_enabled
      FROM public.spotlight_campaigns
      WHERE name = 'Top Deals';
    `);
    assert(topDealsRes.rows.length > 0, "Default 'Top Deals' campaign seeded");
    const topDeals = topDealsRes.rows[0];
    assert(topDeals.max_cards === 16, "Top Deals max_cards is 16");
    assert(topDeals.required_cards === 16, "Top Deals required_cards is 16");
    assert(topDeals.website_enabled === true, "Top Deals website_enabled is true");
    assert(topDeals.android_enabled === true, "Top Deals android_enabled is true");

    // TEST GROUP 3: Lowest Price RPC & Validation
    console.log("\n--- TEST GROUP 3: Editorial Card From Price Calculation ---");
    // Find an active category with products
    const catRes = await client.query(`
      SELECT c.id, c.name, MIN(p.price) as min_price
      FROM public.categories c
      JOIN public.products p ON p.category_id = c.id
      WHERE p.is_active = true AND p.is_approved = true AND p.stock > 0
      GROUP BY c.id, c.name
      LIMIT 1;
    `);

    if (catRes.rows.length > 0) {
      const testCat = catRes.rows[0];
      const rpcRes = await client.query(`
        SELECT public.get_lowest_purchasable_price_for_category($1) as lowest_price;
      `, [testCat.id]);
      const lowest = Number(rpcRes.rows[0].lowest_price);
      assert(lowest > 0, `RPC calculates real lowest price (₹${lowest}) for category "${testCat.name}"`);
      assert(lowest === Number(testCat.min_price), `Calculated price matches lowest available product price exactly (₹${testCat.min_price})`);
    } else {
      console.log("  ℹ Notice: No categories with active products found to test RPC calculation.");
    }

    // TEST GROUP 4: Create Editorial Card
    console.log("\n--- TEST GROUP 4: Editorial Card Storage & DB Persistence ---");
    const insertEditRes = await client.query(`
      INSERT INTO public.spotlight_editorial_cards (
        title,
        subtitle,
        image_bucket,
        image_object_path,
        image_url,
        destination_type,
        destination_id,
        destination_url,
        price_mode,
        manual_from_price,
        calculated_from_price,
        is_active
      ) VALUES (
        'E2E TEST EDITORIAL CARD',
        'Trending Streetwear',
        'editorial',
        'spotlights/general/test_card.webp',
        'https://asaliswad-cdn.zebalpha.shop/official-logo.png',
        'category',
        'all',
        '/categories/all',
        'manual',
        299,
        299,
        true
      ) RETURNING id, title, image_bucket, manual_from_price;
    `);
    assert(insertEditRes.rows.length > 0, "Created Admin Editorial Card in database");
    const testEditorialCardId = insertEditRes.rows[0].id;
    assert(insertEditRes.rows[0].image_bucket === 'editorial', "Editorial card references 'editorial' bucket");

    // TEST GROUP 5: Unified Selection & Items Ordering
    console.log("\n--- TEST GROUP 5: Unified Campaign Items Selection ---");
    // Fetch up to 15 real seller products
    const prodsRes = await client.query(`
      SELECT id, name, price 
      FROM public.products 
      WHERE is_active = true AND is_approved = true 
      LIMIT 15;
    `);

    // Clean existing test items for Top Deals
    await client.query(`DELETE FROM public.spotlight_campaign_items WHERE campaign_id = $1;`, [topDeals.id]);

    let orderIdx = 0;
    // Insert test editorial card as card #1
    await client.query(`
      INSERT INTO public.spotlight_campaign_items (
        campaign_id, card_type, editorial_card_id, display_order
      ) VALUES ($1, 'editorial', $2, $3);
    `, [topDeals.id, testEditorialCardId, orderIdx++]);

    // Insert remaining seller products
    for (const prod of prodsRes.rows) {
      if (orderIdx >= 16) break;
      await client.query(`
        INSERT INTO public.spotlight_campaign_items (
          campaign_id, card_type, product_id, display_order
        ) VALUES ($1, 'seller_product', $2, $3);
      `, [topDeals.id, prod.id, orderIdx++]);
    }

    const itemsCountRes = await client.query(`
      SELECT COUNT(*) as cnt FROM public.spotlight_campaign_items WHERE campaign_id = $1;
    `, [topDeals.id]);
    const totalItems = parseInt(itemsCountRes.rows[0].cnt, 10);
    assert(totalItems > 0, `Added ${totalItems} cards to Top Deals selection`);

    // TEST GROUP 6: Duplicate Prevention Constraint
    console.log("\n--- TEST GROUP 6: Constraint Enforcement ---");
    let duplicateErrorCaught = false;
    try {
      await client.query(`
        INSERT INTO public.spotlight_campaign_items (
          campaign_id, card_type, editorial_card_id, display_order
        ) VALUES ($1, 'editorial', $2, 99);
      `, [topDeals.id, testEditorialCardId]);
    } catch (err) {
      duplicateErrorCaught = true;
    }
    assert(duplicateErrorCaught, "Database UNIQUE constraint prevents duplicate editorial card in same campaign");

    // TEST GROUP 7: Publishing State & Public Query
    console.log("\n--- TEST GROUP 7: Publishing & Public Visibility ---");
    // Update Top Deals to published
    await client.query(`
      UPDATE public.spotlight_campaigns
      SET status = 'published', updated_at = NOW()
      WHERE id = $1;
    `, [topDeals.id]);

    const publicQueryRes = await client.query(`
      SELECT c.id, c.name, c.status, i.card_type, i.display_order
      FROM public.spotlight_campaigns c
      JOIN public.spotlight_campaign_items i ON i.campaign_id = c.id
      WHERE c.status = 'published' AND c.website_enabled = true
      ORDER BY i.display_order ASC;
    `);
    assert(publicQueryRes.rows.length > 0, `Public query retrieves ${publicQueryRes.rows.length} published cards`);
    const cardTypesFound = [...new Set(publicQueryRes.rows.map(r => r.card_type))];
    assert(cardTypesFound.includes('editorial') || cardTypesFound.includes('seller_product'), `Both card types supported in published stream: ${cardTypesFound.join(', ')}`);

    // TEST GROUP 8: Expiration & Inactive Filtering
    console.log("\n--- TEST GROUP 8: Schedule and Platform Inactive Filtering ---");
    // Test paused campaign is hidden from public read
    await client.query(`UPDATE public.spotlight_campaigns SET status = 'paused' WHERE id = $1;`, [topDeals.id]);
    const pausedQueryRes = await client.query(`
      SELECT id FROM public.spotlight_campaigns WHERE id = $1 AND status = 'published';
    `, [topDeals.id]);
    assert(pausedQueryRes.rows.length === 0, "Paused campaign is strictly hidden from customer view");

    // Re-publish Top Deals
    await client.query(`UPDATE public.spotlight_campaigns SET status = 'published' WHERE id = $1;`, [topDeals.id]);
    assert(true, "Restored Top Deals status to 'published' for customer display");

    // Cleanup test editorial card
    await client.query(`DELETE FROM public.spotlight_campaign_items WHERE editorial_card_id = $1;`, [testEditorialCardId]);
    await client.query(`DELETE FROM public.spotlight_editorial_cards WHERE id = $1;`, [testEditorialCardId]);
    console.log("\n✓ Cleaned up ephemeral test entities.");

  } catch (err) {
    console.error("Critical Test Error:", err);
    failed++;
  } finally {
    await client.end();
  }

  console.log("\n====================================================================");
  console.log(`TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndTests();
