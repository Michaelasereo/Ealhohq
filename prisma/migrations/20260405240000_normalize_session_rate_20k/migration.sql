-- Legacy rows still at the old default (₦15,000); product standard is ₦20,000 (see schema default).
UPDATE "therapy_therapists" SET "sessionRate" = 20000 WHERE "sessionRate" = 15000;

-- Admin “default session rate” in stored JSON (guest-facing copy in settings UI only).
UPDATE "admin_app_settings"
SET "payload" = jsonb_set(
  COALESCE("payload"::jsonb, '{}'::jsonb),
  '{defaultSessionRateNgn}',
  '20000'::jsonb,
  true
)
WHERE "id" = 'default'
  AND (("payload"::jsonb->>'defaultSessionRateNgn')::numeric = 15000);
