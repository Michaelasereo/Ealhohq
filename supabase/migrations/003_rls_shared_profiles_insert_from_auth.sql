-- Lets the signup trigger insert into shared_profiles (no JWT session).
-- Prefer tightening this later (e.g. only the EXISTS(auth.users) policy) — WITH CHECK (true) is permissive.

DROP POLICY IF EXISTS "profile_insert_when_auth_user_exists" ON public.shared_profiles;
DROP POLICY IF EXISTS "service_role_insert_profile" ON public.shared_profiles;

CREATE POLICY "service_role_insert_profile" ON public.shared_profiles
  FOR INSERT
  WITH CHECK (true);
