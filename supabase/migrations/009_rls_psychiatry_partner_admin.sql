-- Defense in depth: block direct Supabase PostgREST access from `anon` / `authenticated`
-- JWT roles for clinical and admin tables. Application servers use Prisma with the
-- database role that bypasses RLS.

ALTER TABLE IF EXISTS "psychiatric_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "psychiatric_referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "psychiatric_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "psychiatric_prescriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "psychiatrists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "pharmacy_partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "admin_notifications" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'psychiatric_sessions',
    'psychiatric_referrals',
    'psychiatric_invitations',
    'psychiatric_prescriptions',
    'psychiatrists',
    'pharmacy_partners',
    'admin_notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "block_anon_read_write" ON %I',
      t
    );
    EXECUTE format(
      'CREATE POLICY "block_anon_read_write" ON %I FOR ALL TO anon USING (false) WITH CHECK (false)',
      t
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "block_authenticated_read_write" ON %I',
      t
    );
    EXECUTE format(
      'CREATE POLICY "block_authenticated_read_write" ON %I FOR ALL TO authenticated USING (false) WITH CHECK (false)',
      t
    );
  END LOOP;
END $$;
