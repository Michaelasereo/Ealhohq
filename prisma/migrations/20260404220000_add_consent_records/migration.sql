-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "consent_records" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "bookingId" UUID,
    "consentType" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consent_records_userId_idx" ON "consent_records"("userId");
CREATE INDEX IF NOT EXISTS "consent_records_bookingId_idx" ON "consent_records"("bookingId");
