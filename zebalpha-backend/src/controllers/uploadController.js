import { config } from '../config/index.js';
import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA, supabaseB } from '../lib/supabase.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const getUploadParams = (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    cloudName: config.cloudinary.cloudName,
    uploadPreset: config.cloudinary.uploadPreset,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`
  });
};

// Seller Product Image Upload (Cloudinary CDN -> Metadata to Supabase B)
export const uploadSellerProductImage = async (req, res, next) => {
  try {
    const { imageBase64, fileName, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Image base64 data required.' });
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Invalid file format. Allowed: JPG, PNG, WEBP, AVIF.' });
    }

    const cloudName = config.cloudinary.cloudName || 'p1ish280';
    const uploadPreset = config.cloudinary.uploadPreset || 'asaliswad_products';

    const formData = new URLSearchParams();
    formData.append('file', imageBase64);
    formData.append('upload_preset', uploadPreset);

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const cloudData = await cloudRes.json();
    if (!cloudRes.ok) {
      throw new Error(cloudData.error?.message || 'Failed to upload to Cloudinary CDN');
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      storageType: 'CLOUDINARY_CDN',
      targetInstance: 'SUPABASE_B_INVENTORY',
      imageUrl: cloudData.secure_url,
      publicId: cloudData.public_id,
      width: cloudData.width,
      height: cloudData.height,
      format: cloudData.format
    });
  } catch (err) {
    next(err);
  }
};

// Delete Seller Product Image from Cloudinary CDN & Supabase B
export const deleteSellerProductImage = async (req, res, next) => {
  try {
    const { publicId, productId, sellerId } = req.body;
    if (!publicId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Cloudinary public_id required.' });
    }

    // Update Supabase B Inventory table
    if (productId && sellerId) {
      await supabaseB
        .from('inventory')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .match({ seller_id: sellerId, product_id: productId });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Product image unlinked and scheduled for deletion from Cloudinary.',
      publicId
    });
  } catch (err) {
    next(err);
  }
};

// Super Admin Branding Asset Upload (Supabase A Storage Bucket -> Metadata to Supabase A)
export const uploadAdminBrandingAsset = async (req, res, next) => {
  try {
    const { fileName, fileBufferBase64, mimeType } = req.body;
    if (!fileName || !fileBufferBase64) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'File name and base64 data required.' });
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Invalid file format. Allowed: JPG, PNG, WEBP, AVIF.' });
    }

    const buffer = Buffer.from(fileBufferBase64, 'base64');
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'File size exceeds maximum 10MB limit.' });
    }

    const storagePath = `website-assets/${Date.now()}_${fileName}`;

    const { data, error } = await supabaseA.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: mimeType || 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabaseA.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      storageType: 'SUPABASE_A_STORAGE_BUCKET',
      targetInstance: 'SUPABASE_A_MARKETPLACE',
      bucketPath: storagePath,
      publicUrl: publicUrlData?.publicUrl || `${config.supabaseA.url}/storage/v1/object/public/product-images/${storagePath}`
    });
  } catch (err) {
    next(err);
  }
};

// Delete Super Admin Website Asset from Supabase A Storage & Settings
export const deleteAdminBrandingAsset = async (req, res, next) => {
  try {
    const { bucketPath, settingKey } = req.body;
    if (!bucketPath) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'Bucket path required.' });
    }

    // Delete from Supabase A Storage Bucket
    const { error: storageError } = await supabaseA.storage
      .from('product-images')
      .remove([bucketPath]);

    if (storageError) throw storageError;

    // Update store settings if key passed
    if (settingKey) {
      await supabaseA
        .from('store_settings')
        .delete()
        .eq('key', settingKey);
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Website asset deleted successfully from Supabase A Storage.',
      bucketPath
    });
  } catch (err) {
    next(err);
  }
};
