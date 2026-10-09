import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjpahzstldiatfbutvfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1MzQwNiwiZXhwIjoyMTA0MTI5NDA2fQ.cxVZ_pEUu3pKXAyO5RRjLhp4Zusjd8RctWpZkL3rVWs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanStorage() {
  console.log('--- STARTING COMPREHENSIVE SUPABASE STORAGE CLEANUP ---');

  // 1. Fetch all active product images from database
  const { data: products } = await supabase.from('products').select('image_url, images, packages, specifications');
  
  const activeImageUrls = new Set();
  (products || []).forEach((p) => {
    if (p.image_url) activeImageUrls.add(p.image_url);
    if (Array.isArray(p.images)) {
      p.images.forEach((img) => img && activeImageUrls.add(img));
    }
    if (Array.isArray(p.packages)) {
      p.packages.forEach((pkg) => {
        if (pkg.image_url) activeImageUrls.add(pkg.image_url);
        if (Array.isArray(pkg.gallery)) pkg.gallery.forEach((g) => g && activeImageUrls.add(g));
      });
    }
    if (p.specifications && typeof p.specifications === 'object') {
      const specs = p.specifications;
      if (specs.size_chart?.chart_image) activeImageUrls.add(specs.size_chart.chart_image);
    }
  });

  console.log(`Active product image URLs in database: ${activeImageUrls.size}`);
  Array.from(activeImageUrls).forEach((url) => console.log('Active DB Image:', url));

  // 2. Paginate all files in product-images storage bucket
  let allFiles = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data: pageFiles, error: listErr } = await supabase.storage
      .from('product-images')
      .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (listErr) {
      console.error('Error listing bucket files:', listErr.message);
      break;
    }

    if (!pageFiles || pageFiles.length === 0) break;
    allFiles = allFiles.concat(pageFiles);
    if (pageFiles.length < limit) break;
    offset += limit;
  }

  console.log(`Total files retrieved from product-images bucket: ${allFiles.length}`);

  const filesToDelete = [];

  allFiles.forEach((file) => {
    if (!file.name || file.name.startsWith('.')) return;
    
    // Check if this storage file is currently referenced by any active product in DB
    let isReferenced = false;
    for (const activeUrl of activeImageUrls) {
      if (typeof activeUrl === 'string' && activeUrl.includes(file.name)) {
        isReferenced = true;
        break;
      }
    }

    if (!isReferenced) {
      filesToDelete.push(file.name);
    }
  });

  console.log(`Files identified for deletion (unreferenced/orphaned): ${filesToDelete.length}`);

  if (filesToDelete.length > 0) {
    // Batch delete in chunks of 100
    for (let i = 0; i < filesToDelete.length; i += 100) {
      const chunk = filesToDelete.slice(i, i + 100);
      const { data: deleteRes, error: deleteErr } = await supabase.storage
        .from('product-images')
        .remove(chunk);

      if (deleteErr) {
        console.error(`Error deleting chunk ${i}:`, deleteErr.message);
      } else {
        console.log(`Successfully deleted ${chunk.length} orphaned files from product-images storage bucket.`);
      }
    }
  }

  console.log('--- STORAGE CLEANUP COMPLETE ---');
}

cleanStorage();
