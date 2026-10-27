import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'zebalpha-backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const categoryUpdates = [
  // 1. Men's Fashion
  {
    slug: 'mens-fashion',
    main_category: 'MEN',
    image_url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 't-shirts',
    main_category: 'MEN',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'shirts',
    main_category: 'MEN',
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'hoodies-sweatshirts',
    main_category: 'MEN',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'jeans-bottoms',
    main_category: 'MEN',
    image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'jackets',
    main_category: 'MEN',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80'
  },

  // 2. Women's Fashion
  {
    slug: 'womens-fashion',
    main_category: 'WOMEN',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'kurtis-tunics',
    main_category: 'WOMEN',
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'sarees-blouses',
    main_category: 'WOMEN',
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'dresses-jumpsuits',
    main_category: 'WOMEN',
    image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'tops-tees',
    main_category: 'WOMEN',
    image_url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'bottomwear-palazzos',
    main_category: 'WOMEN',
    image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80'
  },

  // 3. Home & Kitchen
  {
    slug: 'home-kitchen',
    main_category: 'HOME',
    image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'bedsheets-curtains',
    main_category: 'HOME',
    image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'bottles-flasks',
    main_category: 'HOME',
    image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'kitchenware-storage',
    main_category: 'HOME',
    image_url: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80'
  },

  // 4. Electronics & Accessories
  {
    slug: 'electronics',
    main_category: 'ELECTRONICS',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'audio-headphones',
    main_category: 'ELECTRONICS',
    image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'smartwatches',
    main_category: 'ELECTRONICS',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'mobile-accessories',
    main_category: 'ELECTRONICS',
    image_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80'
  },

  // 5. Beauty & Care
  {
    slug: 'beauty-care',
    main_category: 'BEAUTY',
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'skincare',
    main_category: 'BEAUTY',
    image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'haircare',
    main_category: 'BEAUTY',
    image_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'fragrances',
    main_category: 'BEAUTY',
    image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80'
  },

  // 6. Jewellery & Bags
  {
    slug: 'jewellery-bags',
    main_category: 'JEWELLERY',
    image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'handbags-totes',
    main_category: 'JEWELLERY',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'sling-bags',
    main_category: 'JEWELLERY',
    image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'fashion-jewellery',
    main_category: 'JEWELLERY',
    image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80'
  },

  // 7. Footwear
  {
    slug: 'footwear',
    main_category: 'FOOTWEAR',
    image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'sneakers-casual-shoes',
    main_category: 'FOOTWEAR',
    image_url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'formal-ethnic-shoes',
    main_category: 'FOOTWEAR',
    image_url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&auto=format&fit=crop&q=80'
  },
  {
    slug: 'flats-sandals',
    main_category: 'FOOTWEAR',
    image_url: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=800&auto=format&fit=crop&q=80'
  }
];

async function runCleanAndFix() {
  console.log('--- 1. CLEANING FAKE DATA FROM curated_collections ---');
  const { data: existingCurated, error: curErr } = await supabase.from('curated_collections').select('id, title');
  if (curErr) {
    console.error('Error fetching curated_collections:', curErr);
  } else {
    console.log(`Found ${existingCurated.length} fake curated collection(s) to remove:`);
    existingCurated.forEach(c => console.log(` - [${c.id}] ${c.title}`));
    
    const { error: delErr } = await supabase.from('curated_collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) {
      console.error('Error deleting curated_collections:', delErr);
    } else {
      console.log('✅ Successfully deleted all fake items from curated_collections table.');
    }
  }

  console.log('\n--- 2. UPDATING categories TABLE WITH REAL main_category AND COVER IMAGES ---');
  for (const item of categoryUpdates) {
    const { data: updated, error: catUpErr } = await supabase
      .from('categories')
      .update({
        main_category: item.main_category,
        image_url: item.image_url
      })
      .eq('slug', item.slug)
      .select('id, name, slug, main_category, image_url');

    if (catUpErr) {
      console.error(`❌ Failed to update ${item.slug}:`, catUpErr);
    } else if (updated && updated.length > 0) {
      console.log(`✅ [${item.main_category}] ${updated[0].name} -> Updated image & department`);
    } else {
      console.warn(`⚠️ No category found for slug: ${item.slug}`);
    }
  }

  console.log('\n--- 3. VERIFYING FINAL CATEGORIES & COLLECTIONS ---');
  const { data: finalCurated } = await supabase.from('curated_collections').select('id, title');
  console.log(`curated_collections count: ${finalCurated?.length || 0}`);

  const { data: finalCats } = await supabase.from('categories').select('name, main_category, image_url').order('sort_order', { ascending: true });
  console.log(`Categories count: ${finalCats?.length || 0}`);
  console.log('Top categories sample:', finalCats?.slice(0, 7));
  console.log('\n🎉 ALL CLEAN AND PROPERLY FIXED IN DATABASE!');
}

runCleanAndFix().catch(console.error);
