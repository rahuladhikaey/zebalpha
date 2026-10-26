import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import { cacheService } from '../services/cacheService.js';

const MAX_IMAGE_SIZE_BYTES = 50 * 1024; // Strictly 50 KB = 51,200 bytes
const ALLOWED_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

function validateMagicBytes(buffer, mimeType) {
  if (buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/webp') {
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }
  return false;
}

/**
 * Public Customer / Android Endpoint:
 * Fetch published and active Spotlight campaigns
 */
export const getPublishedSpotlightCampaigns = async (req, res) => {
  try {
    const platform = (req.query.platform || 'website').toLowerCase();
    const cacheKey = `spotlight:public:campaigns:v1:${platform}`;

    const { data: campaigns, source } = await cacheService.fetchOrCache(cacheKey, async () => {
      const now = new Date().toISOString();
      let query = supabaseA
        .from('spotlight_campaigns')
        .select(`
          id,
          name,
          slug,
          description,
          header_image_url,
          theme,
          display_order,
          website_enabled,
          android_enabled,
          status,
          starts_at,
          ends_at,
          spotlight_campaign_items (
            id,
            card_type,
            product_id,
            editorial_card_id,
            display_order
          )
        `)
        .eq('status', 'published')
        .order('display_order', { ascending: true });

      if (platform === 'android') {
        query = query.eq('android_enabled', true);
      } else {
        query = query.eq('website_enabled', true);
      }

      const { data: rawCampaigns, error } = await query;
      if (error) {
        console.error('[Spotlight Public Error]:', error);
        return [];
      }

      if (!rawCampaigns || rawCampaigns.length === 0) {
        return [];
      }

      // Filter active schedules
      const activeCampaigns = rawCampaigns.filter((c) => {
        if (c.starts_at && new Date(c.starts_at) > new Date(now)) return false;
        if (c.ends_at && new Date(c.ends_at) < new Date(now)) return false;
        return true;
      });

      if (activeCampaigns.length === 0) return [];

      // Collect all product IDs and editorial card IDs across campaigns
      const allProductIds = [];
      const allEditorialIds = [];

      activeCampaigns.forEach((c) => {
        (c.spotlight_campaign_items || []).forEach((item) => {
          if (item.card_type === 'seller_product' && item.product_id) {
            allProductIds.push(item.product_id);
          } else if (item.card_type === 'editorial' && item.editorial_card_id) {
            allEditorialIds.push(item.editorial_card_id);
          }
        });
      });

      let productsMap = {};
      if (allProductIds.length > 0) {
        const { data: prods } = await supabaseA
          .from('products')
          .select(`
            id,
            name,
            brand,
            price,
            mrp,
            stock,
            image_url,
            images,
            is_active,
            is_approved,
            approval_status,
            category_id,
            seller_id,
            sellers (
              id,
              store_name,
              business_name
            ),
            categories (
              id,
              name
            )
          `)
          .in('id', [...new Set(allProductIds)])
          .eq('is_active', true)
          .eq('is_approved', true);

        (prods || []).forEach((p) => {
          productsMap[p.id] = {
            id: p.id,
            name: p.name,
            brand: p.brand || 'ZEBALPHA',
            price: Number(p.price),
            mrp: p.mrp ? Number(p.mrp) : null,
            stock: p.stock,
            image: p.image_url || (Array.isArray(p.images) && p.images[0]) || '',
            sellerName: p.sellers?.store_name || p.sellers?.business_name || 'Official Seller',
            categoryName: p.categories?.name || 'Apparel',
            destinationUrl: `/products/${p.id}`,
          };
        });
      }

      let editorialMap = {};
      if (allEditorialIds.length > 0) {
        const { data: edits } = await supabaseA
          .from('spotlight_editorial_cards')
          .select('*')
          .in('id', [...new Set(allEditorialIds)])
          .eq('is_active', true);

        (edits || []).forEach((e) => {
          editorialMap[e.id] = {
            id: e.id,
            title: e.title,
            subtitle: e.subtitle,
            image: e.image_url,
            destinationType: e.destination_type,
            destinationId: e.destination_id,
            destinationUrl: e.destination_url,
            priceMode: e.price_mode,
            fromPrice: e.price_mode === 'manual' ? e.manual_from_price : e.calculated_from_price,
          };
        });
      }

      // Format clean published campaigns
      return activeCampaigns.map((camp) => {
        const sortedItems = (camp.spotlight_campaign_items || []).sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        );

        const validCards = [];
        sortedItems.forEach((item) => {
          if (item.card_type === 'seller_product') {
            const p = productsMap[item.product_id];
            if (p) {
              validCards.push({
                cardType: 'seller_product',
                id: p.id,
                title: p.name,
                subtitle: p.sellerName,
                price: p.price,
                mrp: p.mrp,
                image: p.image,
                destinationUrl: p.destinationUrl,
                displayOrder: item.display_order,
              });
            }
          } else if (item.card_type === 'editorial') {
            const e = editorialMap[item.editorial_card_id];
            if (e && e.image) {
              validCards.push({
                cardType: 'editorial',
                id: e.id,
                title: e.title,
                subtitle: e.subtitle,
                fromPrice: e.fromPrice,
                image: e.image,
                destinationUrl: e.destinationUrl,
                displayOrder: item.display_order,
              });
            }
          }
        });

        return {
          id: camp.id,
          name: camp.name,
          slug: camp.slug,
          description: camp.description,
          theme: camp.theme,
          displayOrder: camp.display_order,
          cards: validCards,
        };
      }).filter((camp) => camp.cards.length > 0);
    }, 60); // 60s cache

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: campaigns || [],
      source,
    });
  } catch (error) {
    console.error('[Spotlight Public Exception]:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Failed to fetch spotlight campaigns',
    });
  }
};

/**
 * Super Admin: List All Campaigns
 */
export const getAdminCampaigns = async (req, res) => {
  try {
    const { data, error } = await supabaseA
      .from('spotlight_campaigns')
      .select(`
        *,
        spotlight_campaign_items (
          id,
          card_type,
          product_id,
          editorial_card_id,
          display_order
        )
      `)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }

    const formatted = (data || []).map((c) => ({
      ...c,
      itemCount: c.spotlight_campaign_items?.length || 0,
    }));

    return res.status(HTTP_STATUS.OK).json({ success: true, data: formatted });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin: Create Campaign
 */
export const createAdminCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      header_image_url,
      theme = 'default',
      status = 'draft',
      selection_mode = 'manual',
      category_scope = 'all',
      max_cards = 16,
      required_cards = 16,
      default_sort = 'popular',
      display_order = 0,
      starts_at,
      ends_at,
      website_enabled = true,
      android_enabled = true,
    } = req.body;

    if (!name?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Campaign Name is required.' });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const record = {
      name: name.trim(),
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      description: description ? description.trim() : null,
      header_image_url: header_image_url ? header_image_url.trim() : null,
      theme,
      status: status || 'draft',
      selection_mode,
      category_scope,
      max_cards: Number(max_cards) || 16,
      required_cards: Number(required_cards) || 16,
      default_sort,
      display_order: Number(display_order) || 0,
      starts_at: starts_at ? new Date(starts_at).toISOString() : null,
      ends_at: ends_at ? new Date(ends_at).toISOString() : null,
      website_enabled: Boolean(website_enabled),
      android_enabled: Boolean(android_enabled),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseA.from('spotlight_campaigns').insert([record]).select('*').single();
    if (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }

    return res.status(HTTP_STATUS.CREATED).json({ success: true, data });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin: Upload Image (Strict ≤ 50 KB check + magic bytes)
 * Supports both base64 JSON payload and multipart file buffer
 */
export const uploadEditorialImage = async (req, res) => {
  try {
    let buffer;
    let mimeType = 'image/webp';

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = (req.file.mimetype || 'image/webp').toLowerCase();
    } else if (req.body?.imageBase64) {
      const raw = req.body.imageBase64;
      const match = raw.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1].toLowerCase();
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(raw, 'base64');
      }
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'No image file or imageBase64 provided.' });
    }

    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      const sizeKb = (buffer.length / 1024).toFixed(1);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Image must be 50 KB or smaller. Uploaded file is ${sizeKb} KB (${buffer.length} bytes). Maximum allowed: 50 KB (51,200 bytes).`,
        actualSize: buffer.length,
        maxAllowed: MAX_IMAGE_SIZE_BYTES,
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Unsupported format (${mimeType}). Accepted: WebP, JPEG, PNG.`,
      });
    }

    if (!validateMagicBytes(buffer, mimeType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'File signature does not match image format. Upload rejected.',
      });
    }

    let ext = 'webp';
    if (mimeType === 'image/jpeg') ext = 'jpg';
    else if (mimeType === 'image/png') ext = 'png';

    const campaignId = req.body.campaignId || 'general';
    const cardId = req.body.cardId || `card_${Date.now()}`;
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const objectKey = `spotlights/${campaignId}/${cardId}/${uniqueId}.${ext}`;
    const targetBucket = 'editorial';

    const { error: uploadError } = await supabaseA.storage
      .from(targetBucket)
      .upload(objectKey, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Storage upload failed: ${uploadError.message}`,
      });
    }

    const { data: publicUrlData } = supabaseA.storage.from(targetBucket).getPublicUrl(objectKey);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
      objectKey,
      bucket: targetBucket,
      fileSize: buffer.length,
      formattedSize: `${(buffer.length / 1024).toFixed(1)} KB`,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  }
};
