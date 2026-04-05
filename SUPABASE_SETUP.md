# Supabase setup — custom OTP (Resend) + disable default auth emails

Follow these steps in the Supabase Dashboard for the Ealho Therapy project.

## Step 1 — Turn off Supabase email sending (use Resend SMTP)

1. Go to **Supabase → Authentication → Settings**
2. Scroll to **SMTP Settings**
3. Enable **custom SMTP**: **ON**
4. Fill in:

   | Field          | Value                                      |
   | -------------- | ------------------------------------------ |
   | Host           | `smtp.resend.com`                          |
   | Port           | `465`                                      |
   | Username       | `resend`                                   |
   | Password       | Your `RESEND_API_KEY` (starts with `re_`)  |
   | Sender name    | `Ealho Therapy`                          |
   | Sender email   | Your verified domain (e.g. `noreply@ealho.com`) |

5. Click **Save**

> Alternatively you can leave SMTP off and rely entirely on Resend from the Next.js API (this repo sends OTP emails via Resend in code). If you disable confirmations (Step 2), Supabase will not send its own signup emails for password signups when confirmations are off.

## Step 2 — Disable Supabase email confirmations (we verify with custom OTP)

1. Go to **Authentication → Settings**
2. Find **Enable email confirmations**
3. Turn it **OFF**  
   (Verification is handled by Resend + `auth_otp_codes` + `/api/auth/verify-otp`.)
4. Click **Save**

With confirmations off, `signUp` creates a **confirmed** user immediately after your app verifies the OTP.

## Step 3 — Run OTP table migration

1. Go to **SQL Editor** in Supabase
2. Open `supabase/migrations/004_auth_otp_codes.sql` in this repo
3. Paste the full contents into the editor and click **Run**

This creates `public.auth_otp_codes` with RLS enabled and **no** policies (only the **service role** from server routes should access this table).

The same migration lives in the repo as `supabase/migrations/004_auth_otp_codes.sql` (numbered **004** because `003_*.sql` already exists). Full SQL:

```sql
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
```

## Step 4 — Chat tables RLS (after Prisma `add_chat_system` migration)

1. Apply the Prisma migration that creates `chat_threads`, `chat_messages`, `chat_audit_logs`, and `chat_consents`.
2. In **Supabase → SQL Editor**, run `supabase/migrations/007_chat_rls.sql` from this repo.

This enables row-level security for Supabase Realtime on `chat_messages` (participants only). Chat writes from the app use Prisma on the server; policies cover the browser client + Realtime.

## Step 5 — Enable Realtime for `chat_messages`

1. **Supabase → Database → Publications** (or **Replication** in older UI).
2. Ensure `supabase_realtime` publication includes table `chat_messages` (INSERT events).

## Step 6 — Chat encryption & clinical alerts (`.env.local`)

- `CHAT_ENCRYPTION_KEY` — 64 hex characters (32 bytes). Generate:  
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `CLINICAL_LEAD_WHATSAPP` — E.164-style digits for high-risk scan alerts (optional).

## Step 7 — Environment variables

Ensure these are set (e.g. `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to the client)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional; defaults in app code if unset)
- `ANTHROPIC_API_KEY` (for automated chat safety scanning)
- `NEXT_PUBLIC_APP_URL` (WhatsApp deep links to `/messages` and `/therapist/messages`)
