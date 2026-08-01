-- Run this in your Supabase SQL Editor to resolve the 'approval_status' missing column error.

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';

-- Notify PostgREST to reload the schema cache so the error disappears instantly
NOTIFY pgrst, 'reload schema';
