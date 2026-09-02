import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA } from '../lib/supabase.js';
import { virtualTryOnService } from '../services/vto/VirtualTryOnService.js';

const MAX_IMAGE_PAYLOAD_SIZE = 12 * 1024 * 1024; // 12MB base64 string safety limit

/**
 * Executes a Virtual Try-On inference
 * POST /api/virtual-try-on
 */
export const executeVirtualTryOn = async (req, res, next) => {
  let { personImage, productId, garmentImage, category = 'upper_body' } = req.body;

  try {
    if (!personImage) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Please provide a person photo for virtual try-on.'
      });
    }

    if (personImage.length > MAX_IMAGE_PAYLOAD_SIZE) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Photo is too large. Please use a photo under 10MB.'
      });
    }

    // Resolve garment image from product if productId is provided
    let resolvedGarmentImage = garmentImage;
    let resolvedCategory = category;

    if (productId) {
      const { data: product, error: prodErr } = await supabaseA
        .from('products')
        .select('id, name, image_url, images, virtual_tryon_image, virtual_tryon_category')
        .eq('id', productId)
        .maybeSingle();

      if (!prodErr && product) {
        // Priority 1: dedicated virtual_tryon_image
        // Priority 2: primary product image
        // Priority 3: first item in images array
        resolvedGarmentImage = product.virtual_tryon_image 
          || product.image_url 
          || (Array.isArray(product.images) && product.images[0])
          || resolvedGarmentImage;

        if (product.virtual_tryon_category) {
          resolvedCategory = product.virtual_tryon_category;
        }
      }
    }

    if (!resolvedGarmentImage) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Unable to locate clothing product image for this item.'
      });
    }

    // Run AI Virtual Try-On
    const result = await virtualTryOnService.processVirtualTryOn({
      personImage,
      garmentImage: resolvedGarmentImage,
      category: resolvedCategory,
      productId
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      imageUrl: result.imageUrl,
      productId,
      processingTimeMs: result.processingTimeMs,
      provider: result.provider,
      notice: result.notice || undefined,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (err) {
    next(err);
  } finally {
    // Zero-retention: Purge memory reference
    personImage = null;
  }
};

/**
 * Returns supported VTO capabilities and categories
 * GET /api/virtual-try-on/config
 */
export const getVTOConfig = (req, res) => {
  const activeProvider = virtualTryOnService.getActiveProvider();
  res.status(HTTP_STATUS.OK).json({
    success: true,
    isAvailable: true,
    provider: activeProvider.name,
    supportedCategories: [
      { id: 'upper_body', name: 'T-Shirts, Shirts & Tops' },
      { id: 'hoodies', name: 'Hoodies & Sweatshirts' },
      { id: 'outerwear', name: 'Jackets & Coats' },
      { id: 'dresses', name: 'Dresses & One-Pieces' },
      { id: 'lower_body', name: 'Pants & Bottoms' }
    ],
    guidelines: [
      'Face the camera directly',
      'Keep your upper body clearly visible',
      'Ensure good indoor/outdoor lighting',
      'Avoid heavy clothing obstructions',
      'Only one person in the photo'
    ]
  });
};
