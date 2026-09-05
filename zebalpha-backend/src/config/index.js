import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.asaliswad.com',
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  // PostgreSQL Direct Database Connection (Supabase Pooler)
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  db: {
    host: process.env.DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'postgres',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || ''
  },
  // Unified Production Database (Single Data Source)
  supabaseA: {
    url: process.env.SUPABASE_A_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjpahzstldiatfbutvfc.supabase.co',
    serviceKey: process.env.SUPABASE_A_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_A_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  },
  supabaseB: {
    url: process.env.SUPABASE_B_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qjpahzstldiatfbutvfc.supabase.co',
    serviceKey: process.env.SUPABASE_B_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_B_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || ''
  },
  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL || '',
    password: process.env.SHIPROCKET_PASSWORD || ''
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY || ''
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || ''
  },
  virtualTryOn: {
    provider: process.env.VIRTUAL_TRYON_PROVIDER || 'mock', // 'replicate' | 'fashn' | 'fal' | 'mock'
    apiKey: process.env.VIRTUAL_TRYON_API_KEY || process.env.REPLICATE_API_TOKEN || process.env.FASHN_API_KEY || process.env.FAL_KEY || '',
    apiUrl: process.env.VIRTUAL_TRYON_API_URL || '',
    modelId: process.env.VIRTUAL_TRYON_MODEL || 'cuuupid/idm-vton:c871bb9b046607b680486f0690f3c443d6f794da9199cf8618b3240b2d422a83',
    timeoutMs: parseInt(process.env.VIRTUAL_TRYON_TIMEOUT || '60000', 10),
  }
};
