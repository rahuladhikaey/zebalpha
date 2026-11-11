import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://qjpahzstldiatfbutvfc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTM0MDYsImV4cCI6MjEwNDEyOTQwNn0.ixVg7bopkA0BAKpOVhuQSVUlWNWB-o_YIPuowta53lI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CLOUDINARY_CLOUD_NAME = 'vtweyirx';
const CLOUDINARY_UPLOAD_PRESET = 'zebalpha_preset';

async function uploadToCloudinary(base64Data, label = 'image') {
  if (!base64Data.startsWith('data:')) {
    return base64Data; // Already a URL
  }

  const formData = new FormData();
  formData.append('file', base64Data);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'products');

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudinary upload failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (data.secure_url) {
      // Inject auto WebP/AVIF format and auto quality
      return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    throw new Error('No secure_url returned by Cloudinary');
  } catch (err) {
    console.error(`[Error uploading ${label}]:`, err.message);
    throw err;
  }
}

async function runMigration() {
  console.log('--- Step 1: Fetching all products from Supabase ---');
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url, images')
    .order('created_at', { ascending: false });

  if (error || !products) {
    console.error('Failed to fetch products:', error);
    process.exit(1);
  }

  console.log(`Total products found: ${products.length}`);

  const updates = [];
  const base64Products = products.filter(
    (p) =>
      (p.image_url && p.image_url.startsWith('data:')) ||
      (Array.isArray(p.images) && p.images.some((img) => img && img.startsWith('data:')))
  );

  console.log(`Products with Base64 images to migrate: ${base64Products.length}\n`);

  for (let i = 0; i < base64Products.length; i++) {
    const p = base64Products[i];
    console.log(`[${i + 1}/${base64Products.length}] Migrating: "${p.name.slice(0, 45)}" (ID: ${p.id})`);

    let newImageUrl = p.image_url;
    if (p.image_url && p.image_url.startsWith('data:')) {
      console.log(`   Uploading primary image (${(p.image_url.length / 1024).toFixed(1)} KB)...`);
      newImageUrl = await uploadToCloudinary(p.image_url, `${p.id}_primary`);
      console.log(`   -> Cloudinary: ${newImageUrl}`);
    }

    const newImages = [];
    if (Array.isArray(p.images) && p.images.length > 0) {
      for (let j = 0; j < p.images.length; j++) {
        const img = p.images[j];
        if (img && img.startsWith('data:')) {
          console.log(`   Uploading gallery image #${j + 1} (${(img.length / 1024).toFixed(1)} KB)...`);
          const uploadedUrl = await uploadToCloudinary(img, `${p.id}_gallery_${j + 1}`);
          console.log(`   -> Cloudinary: ${uploadedUrl}`);
          newImages.push(uploadedUrl);
        } else if (img) {
          newImages.push(img);
        }
      }
    } else if (newImageUrl) {
      newImages.push(newImageUrl);
    }

    updates.push({
      id: p.id,
      name: p.name,
      new_image_url: newImageUrl,
      new_images: newImages,
    });
  }

  console.log('\n--- Step 2: Generating SQL Migration File ---');
  let sqlContent = `-- Migration: Replace raw Base64 image strings with Cloudinary CDN URLs
-- Generated on: ${new Date().toISOString()}
-- Target: public.products table

BEGIN;

`;

  for (const item of updates) {
    const escapedImageUrl = item.new_image_url.replace(/'/g, "''");
    const escapedImagesArray = item.new_images.map((url) => `'${url.replace(/'/g, "''")}'`).join(', ');

    sqlContent += `-- Product: ${item.name.replace(/\n/g, ' ')}
UPDATE public.products
SET 
  image_url = '${escapedImageUrl}',
  images = ARRAY[${escapedImagesArray}]::text[],
  updated_at = NOW()
WHERE id = '${item.id}';

`;
  }

  sqlContent += `COMMIT;
`;

  const sqlFilePath = path.resolve('supabase/20261111_migrate_base64_images_to_cloudinary.sql');
  fs.writeFileSync(sqlFilePath, sqlContent, 'utf-8');
  console.log(`SQL migration file successfully written to: ${sqlFilePath}`);

  const mappingFilePath = path.resolve('scripts/cloudinary_migration_mapping.json');
  fs.writeFileSync(mappingFilePath, JSON.stringify(updates, null, 2), 'utf-8');
  console.log(`Mapping JSON saved to: ${mappingFilePath}`);

  console.log('\n--- Migration preparation complete! ---');
  console.log(`All ${updates.length} products have been uploaded to Cloudinary CDN!`);
}

runMigration().catch((e) => {
  console.error('Fatal error in migration:', e);
  process.exit(1);
});
