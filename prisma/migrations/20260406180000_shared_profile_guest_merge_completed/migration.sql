-- AlterTable
ALTER TABLE "shared_profiles" ADD COLUMN IF NOT EXISTS "guestMergeCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shared_profiles" ADD COLUMN IF NOT EXISTS "guestMergeBannerPending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shared_profiles" ADD COLUMN IF NOT EXISTS "guestMergeSessionCount" INTEGER;
