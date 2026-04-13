-- Partner branding logos (super referral). Run in Supabase SQL Editor.
-- Server uploads use the service role; public bucket so logo URLs work in email and setup UI.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'partner-logos',
  'partner-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_partner_logos" ON storage.objects;
CREATE POLICY "public_read_partner_logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'partner-logos');
