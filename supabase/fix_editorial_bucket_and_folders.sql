-- ====================================================================
-- ZEBALPHA: FIX "editorial" STORAGE BUCKET, POLICIES & FOLDER STRUCTURE
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ====================================================================

-- 1. Ensure the 'editorial' bucket exists and is set to PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'editorial',
    'editorial',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/jpg'];

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

INSERT INTO storage.objects (bucket_id, name, metadata)
VALUES 
    ('editorial', 'homepage/.emptyFolderPlaceholder', '{"mimetype":"application/x-empty"}'::jsonb),
    ('editorial', 'homepage/woven/.emptyFolderPlaceholder', '{"mimetype":"application/x-empty"}'::jsonb),
    ('editorial', 'homepage/curated-collections/.emptyFolderPlaceholder', '{"mimetype":"application/x-empty"}'::jsonb)
ON CONFLICT (bucket_id, name) DO NOTHING;

-- 4. Verify results
SELECT id, name, public FROM storage.buckets WHERE id = 'editorial';
SELECT name, bucket_id, created_at FROM storage.objects WHERE bucket_id = 'editorial';
