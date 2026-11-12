-- Migration: 20261112100100_storage_buckets_init.sql
-- Idempotent storage buckets initialization and RLS policies for new instances

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'covers', 'covers', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'covers');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'audio-files', 'audio-files', false, 10485760, ARRAY['audio/mpeg','audio/mp4','audio/ogg','audio/flac','audio/x-matroska','audio/wav','audio/aac','audio/webm','audio/x-aiff','audio/x-caf','audio/opus']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'audio-files');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'backups', 'backups', false, 5242880, ARRAY['application/json','application/gzip','application/zip']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'backups');

-- Storage object policies for covers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Covers'
  ) THEN
    CREATE POLICY "Public Access for Covers" ON storage.objects
      FOR SELECT USING (bucket_id = 'covers');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated uploads for Covers'
  ) THEN
    CREATE POLICY "Authenticated uploads for Covers" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated updates for Covers'
  ) THEN
    CREATE POLICY "Authenticated updates for Covers" ON storage.objects
      FOR ALL TO authenticated USING (bucket_id = 'covers');
  END IF;
END $$;
