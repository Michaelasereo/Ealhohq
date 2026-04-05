-- AlterTable (idempotent)
ALTER TABLE "therapy_bookings" ADD COLUMN IF NOT EXISTS "guestBookingReason" TEXT;
