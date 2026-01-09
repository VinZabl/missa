/*
  # Create Storage Bucket for Menu Images

  This migration creates the storage bucket needed for uploading menu item images.
  Run this if the bucket doesn't exist yet.
*/

-- Create storage bucket for menu images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to menu images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access for menu images'
  ) THEN
    CREATE POLICY "Public read access for menu images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'menu-images');
  END IF;
END $$;

-- Allow public uploads (admin dashboard has its own authentication)
-- Note: In production, you may want to restrict this further
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can upload menu images'
  ) THEN
    CREATE POLICY "Public can upload menu images"
    ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'menu-images');
  END IF;
END $$;

-- Allow public to update menu images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can update menu images'
  ) THEN
    CREATE POLICY "Public can update menu images"
    ON storage.objects
    FOR UPDATE
    TO public
    USING (bucket_id = 'menu-images');
  END IF;
END $$;

-- Allow public to delete menu images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can delete menu images'
  ) THEN
    CREATE POLICY "Public can delete menu images"
    ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id = 'menu-images');
  END IF;
END $$;

