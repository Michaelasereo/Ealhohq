-- Custom OTP storage for Resend-delivered codes (run in Supabase SQL Editor).
-- Numbered 004 because 003_rls_shared_profiles_insert_from_auth.sql already exists.

CREATE TABLE IF NOT EXISTS public.auth_otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  code        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'signup',
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT false,
  attempts    INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_email_type
  ON public.auth_otp_codes (email, type, used, expires_at);

CREATE OR REPLACE FUNCTION public.delete_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.auth_otp_codes
  WHERE expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies: anon/authenticated clients cannot read/write; use service role from API routes only.
