-- EALHO100 / EALHO10 are documented for QA and promos; seed.ts creates them for local dev only.
-- Production/staging DBs that never ran `prisma db seed` had no rows here → "Invalid discount code".

INSERT INTO "discount_codes" (
  "id",
  "code",
  "discountType",
  "discountValue",
  "maxUses",
  "usedCount",
  "expiresAt",
  "isActive",
  "createdAt"
)
VALUES
  (gen_random_uuid(), 'EALHO100', 'full', 0, NULL, 0, NULL, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'EALHO10', 'percentage', 10, NULL, 0, NULL, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "isActive" = EXCLUDED."isActive",
  "discountType" = EXCLUDED."discountType",
  "discountValue" = EXCLUDED."discountValue",
  "maxUses" = EXCLUDED."maxUses",
  "expiresAt" = EXCLUDED."expiresAt";
