-- AlterEnum-like: credits as decimal for partial refunds
ALTER TABLE "therapy_credits" ALTER COLUMN "balance" DROP DEFAULT;
ALTER TABLE "therapy_credits" ALTER COLUMN "balance" TYPE DECIMAL(10,2) USING ("balance"::decimal);
ALTER TABLE "therapy_credits" ALTER COLUMN "balance" SET DEFAULT 0;

ALTER TABLE "therapy_credit_transactions" ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING ("amount"::decimal);

-- Booking cancellation / reschedule / discount
ALTER TABLE "therapy_bookings" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT,
ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastRescheduledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "discountCode" TEXT,
ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2);

-- Session earnings snapshot
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "therapistEarnings" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "platformEarnings" DECIMAL(10,2);

-- Therapist default session rate (new rows only; existing unchanged)
ALTER TABLE "therapy_therapists" ALTER COLUMN "sessionRate" SET DEFAULT 20000;

CREATE TABLE IF NOT EXISTS "discount_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "discount_codes_code_key" ON "discount_codes"("code");

CREATE TABLE IF NOT EXISTS "discount_code_uses" (
    "id" UUID NOT NULL,
    "codeId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAmount" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "discount_code_uses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "earnings_config" (
    "id" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "therapistPercent" DECIMAL(5,2) NOT NULL,
    "platformPercent" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setByAdminId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "earnings_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "earnings_config_therapistId_key" ON "earnings_config"("therapistId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discount_code_uses_codeId_fkey'
  ) THEN
    ALTER TABLE "discount_code_uses" ADD CONSTRAINT "discount_code_uses_codeId_fkey"
      FOREIGN KEY ("codeId") REFERENCES "discount_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discount_code_uses_bookingId_fkey'
  ) THEN
    ALTER TABLE "discount_code_uses" ADD CONSTRAINT "discount_code_uses_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "therapy_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'earnings_config_therapistId_fkey'
  ) THEN
    ALTER TABLE "earnings_config" ADD CONSTRAINT "earnings_config_therapistId_fkey"
      FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
