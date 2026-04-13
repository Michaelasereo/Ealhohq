-- Week 3: partner pool coverage reference on therapy bookings

ALTER TABLE "therapy_bookings" ADD COLUMN IF NOT EXISTS "partnerClientCoverageId" UUID;

CREATE INDEX IF NOT EXISTS "therapy_bookings_partnerClientCoverageId_idx"
  ON "therapy_bookings"("partnerClientCoverageId");

ALTER TABLE "therapy_bookings" DROP CONSTRAINT IF EXISTS "therapy_bookings_partnerClientCoverageId_fkey";

ALTER TABLE "therapy_bookings" ADD CONSTRAINT "therapy_bookings_partnerClientCoverageId_fkey"
  FOREIGN KEY ("partnerClientCoverageId") REFERENCES "partner_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
