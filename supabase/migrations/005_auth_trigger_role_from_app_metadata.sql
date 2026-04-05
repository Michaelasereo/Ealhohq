-- Read therapist role from app_metadata (OTP flow sets role there, not user_metadata).
-- Re-run in Supabase SQL Editor if you already applied 001 without this fix.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  r text;
BEGIN
  r := COALESCE(
    NEW.raw_app_meta_data->>'role',
    NEW.raw_user_meta_data->>'role',
    'patient'
  );
  INSERT INTO public.shared_profiles (id, role, "fullName", status)
  VALUES (
    NEW.id,
    r,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN r = 'therapist' THEN 'pending'
      ELSE 'active'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
