-- Fix storage bucket RLS policies for avatar and portfolio uploads

-- Create buckets if they don't exist (run this in Supabase Dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('portfolios', 'portfolios', true);

-- Drop existing policies if any
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Portfolio images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can update portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can delete portfolio images" ON storage.objects;

-- Avatars bucket policies
-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- Portfolios bucket policies
-- Anyone can view portfolio images (public bucket)
CREATE POLICY "Portfolio images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolios');

-- Authenticated users can upload portfolio images
CREATE POLICY "Professionals can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolios'
  AND auth.role() = 'authenticated'
);

-- Users can update their portfolio images
CREATE POLICY "Professionals can update portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolios'
  AND auth.role() = 'authenticated'
);

-- Users can delete their portfolio images
CREATE POLICY "Professionals can delete portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolios'
  AND auth.role() = 'authenticated'
);
