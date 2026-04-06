-- Add package support for multi-session bookings.
-- Idempotent guards are used so this can run safely on environments with partial schema.

CREATE TABLE IF NOT EXISTS "therapy_session_packages" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "packageType" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "usedSessions" INTEGER NOT NULL DEFAULT 0,
    "remainingSessions" INTEGER NOT NULL,
    "pricePerSession" DECIMAL(10,2) NOT NULL,
    "totalPaid" DECIMAL(10,2) NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "paystackReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "therapy_session_packages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "therapy_bookings"
ADD COLUMN IF NOT EXISTS "packageId" UUID;

CREATE INDEX IF NOT EXISTS "therapy_session_packages_patientId_status_idx"
ON "therapy_session_packages"("patientId", "status");

CREATE INDEX IF NOT EXISTS "therapy_session_packages_therapistId_status_idx"
ON "therapy_session_packages"("therapistId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_session_packages_patientId_fkey'
  ) THEN
    ALTER TABLE "therapy_session_packages"
    ADD CONSTRAINT "therapy_session_packages_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_session_packages_therapistId_fkey'
  ) THEN
    ALTER TABLE "therapy_session_packages"
    ADD CONSTRAINT "therapy_session_packages_therapistId_fkey"
    FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_bookings_packageId_fkey'
  ) THEN
    ALTER TABLE "therapy_bookings"
    ADD CONSTRAINT "therapy_bookings_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "therapy_session_packages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
