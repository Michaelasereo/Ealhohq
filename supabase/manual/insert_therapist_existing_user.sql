-- Run in Supabase → SQL Editor.
--
-- 1) Find the user id:
--    SELECT id, email FROM auth.users WHERE email = 'your.therapist@email.com';
-- 2) Set v_user below to that UUID (one place only).
-- 3) Adjust bio, specializations, qualifications, session rate, duration.

DO $$
DECLARE
  v_user uuid := '7ac8d2cd-f717-4f35-a864-d30b3888f145'::uuid;
BEGIN

  UPDATE public.shared_profiles
  SET
    "role" = 'therapist',
    "status" = 'pending',
    "updatedAt" = NOW()
  WHERE id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No row in shared_profiles for id %. Create the user first or fix the id.', v_user;
  END IF;

  INSERT INTO public.therapy_therapists (
    id,
    "profileId",
    bio,
    specializations,
    qualifications,
    "profilePhoto",
    status,
    "sessionRate",
    "sessionDuration",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    v_user,
    'Update this bio after insert if needed.',
    ARRAY['Anxiety', 'Depression']::text[],
    ARRAY['MSc Clinical Psychology']::text[],
    NULL,
    'pending',
    15000.00,
    50,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.therapy_therapists t WHERE t."profileId" = v_user
  );
END $$;
