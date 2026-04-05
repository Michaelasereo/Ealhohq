-- Run after creating bucket `profile-photos` (public) in Supabase Dashboard → Storage.
-- Paths: `{auth_user_uuid}/profile.{ext}`

DROP POLICY IF EXISTS "public_read_profile_photos" ON storage.objects;
CREATE POLICY "public_read_profile_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "users_upload_own_photo" ON storage.objects;
CREATE POLICY "users_upload_own_photo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "users_update_own_photo" ON storage.objects;
CREATE POLICY "users_update_own_photo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "users_delete_own_photo" ON storage.objects;
CREATE POLICY "users_delete_own_photo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
