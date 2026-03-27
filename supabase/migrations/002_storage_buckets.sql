-- Storage buckets setup
-- Migration: 002_storage_buckets.sql

-- Videos bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  5368709120, -- 5GB
  ARRAY['video/mp4', 'video/webm', 'application/x-mpegURL', 'video/MP2T']
)
ON CONFLICT (id) DO NOTHING;

-- Certificates bucket (public - for PDF download links)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Covers bucket (course covers, public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Videos: anyone can read, service role can write
CREATE POLICY "videos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "certificates_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "covers_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');

-- Authenticated users can upload avatars
CREATE POLICY "avatars_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
  );

-- Authenticated users can update own avatar
CREATE POLICY "avatars_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
  );

-- Admin can upload covers
CREATE POLICY "covers_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'covers' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
