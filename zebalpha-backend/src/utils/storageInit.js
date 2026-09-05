import { supabaseA } from '../lib/supabase.js';

/**
 * Automatically checks and initializes required Supabase Storage buckets on backend startup.
 */
export async function ensureStorageBuckets() {
  try {
    const { data: buckets, error } = await supabaseA.storage.listBuckets();
    if (error) {
      console.warn('[Storage Init Notice]:', error.message);
      return;
    }

    const hasProductImages = buckets?.some(b => b.name === 'product-images');
    if (!hasProductImages) {
      console.log('📦 Creating Supabase Storage bucket "product-images"...');
      const { error: createErr } = await supabaseA.storage.createBucket('product-images', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
      });

      if (createErr) {
        console.warn('[Storage Create Notice]:', createErr.message);
      } else {
        console.log('✅ Supabase Storage bucket "product-images" created automatically with public access!');
      }
    } else {
      console.log('✅ Supabase Storage bucket "product-images" is ready.');
    }
  } catch (err) {
    console.warn('[Storage Init Warning]:', err.message);
  }
}
