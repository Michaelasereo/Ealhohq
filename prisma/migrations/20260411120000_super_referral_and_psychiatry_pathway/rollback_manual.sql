-- Run this ONCE if migration failed partway or you need to reset this migration's objects.
-- Safe to re-run: uses IF EXISTS / IF EXISTS constraints.
-- Order: children first, then therapy_patients column, then partner tables.

DROP TABLE IF EXISTS "psychiatric_prescriptions" CASCADE;
DROP TABLE IF EXISTS "psychiatric_sessions" CASCADE;
DROP TABLE IF EXISTS "psychiatric_referrals" CASCADE;
DROP TABLE IF EXISTS "psychiatrist_availability_overrides" CASCADE;
DROP TABLE IF EXISTS "psychiatrist_availability_schedules" CASCADE;
DROP TABLE IF EXISTS "psychiatrists" CASCADE;
DROP TABLE IF EXISTS "pharmacy_partners" CASCADE;

ALTER TABLE "therapy_patients" DROP CONSTRAINT IF EXISTS "therapy_patients_partnerClientId_fkey";
DROP INDEX IF EXISTS "therapy_patients_partnerClientId_key";
ALTER TABLE "therapy_patients" DROP COLUMN IF EXISTS "partnerClientId";

DROP TABLE IF EXISTS "partner_credit_allocations" CASCADE;
DROP TABLE IF EXISTS "partner_clients" CASCADE;
DROP TABLE IF EXISTS "super_referral_partners" CASCADE;
