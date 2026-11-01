-- ====================================================================
-- ZEBALPHA: FIX "editorial" STORAGE BUCKET, POLICIES & FOLDER STRUCTURE
-- (Clean Version with NO ON-CONFLICT constraints to prevent 42P10 error)
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ====================================================================

-- 1. Ensure the 'editorial' bucket exists and is set to PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'editorial', 'editorial', true, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/jpg']
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'editorial'
);

-- Ensure public flag is true and mime types allowed
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/jpg']
WHERE id = 'editorial';

-- 2. Storage Policies for 'editorial' Bucket
-- (Allows public image viewing on homepage and full management for admin/service role)

-- A. Public Read Policy
DROP POLICY IF EXISTS "Public read editorial bucket" ON storage.objects;
CREATE POLICY "Public read editorial bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'editorial');

-- B. Upload / Insert Policy
DROP POLICY IF EXISTS "Allow upload to editorial bucket" ON storage.objects;
CREATE POLICY "Allow upload to editorial bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'editorial');

-- C. Update Policy
DROP POLICY IF EXISTS "Allow update in editorial bucket" ON storage.objects;
CREATE POLICY "Allow update in editorial bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'editorial')
WITH CHECK (bucket_id = 'editorial');

-- D. Delete Policy
DROP POLICY IF EXISTS "Allow delete from editorial bucket" ON storage.objects;
CREATE POLICY "Allow delete from editorial bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'editorial');

-- 3. Create Virtual Folder Structure inside 'editorial'
-- In Supabase Storage, folders appear once placeholder marker objects exist:
--   📁 homepage/
--        ├── 📁 woven/ (for Woven to Be Remembered cards)
--        └── 📁 curated-collections/ (for Square collections)

-- Create homepage/.emptyFolderPlaceholder
INSERT INTO storage.objects (bucket_id, name, metadata)
SELECT 'editorial', 'homepage/.emptyFolderPlaceholder', '{"mimetype":"application/x-empty"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'editorial' AND name = 'homepage/.emptyFolderPlaceholder'
);

-- Create homepage/woven/.emptyFolderPlaceholder
INSERT INTO storage.objects (bucket_id, name, metadata)
SELECT 'editorial', 'homepage/woven/.emptyFolderPlaceholder', '{"mimetype":"application/x-empty"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'editorial' AND name = 'homepage/woven/.emptyFolderPlaceholder'
);

-- Create homepage/curated-collections/.emptyFolderPlaceholder
INSERT INTO storage.objects (bucket_id, name, metadata)
SELECT 'editorial', 'homepage/curated-collections/.emptyFolderPlaceholder', '{"mimetype":"application/x-empty"}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'editorial' AND name = 'homepage/curated-collections/.emptyFolderPlaceholder'
);

-- 4. Verify results
SELECT id, name, public FROM storage.buckets WHERE id = 'editorial';
SELECT name, bucket_id, created_at FROM storage.objects WHERE bucket_id = 'editorial';
