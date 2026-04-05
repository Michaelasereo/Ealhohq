-- AlterTable (idempotent)
ALTER TABLE "therapy_bookings" ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "therapy_bookings" ADD COLUMN IF NOT EXISTS "clientAlias" TEXT;
