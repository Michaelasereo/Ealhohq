-- Referral partner program: clinics earn per completed first session

CREATE TABLE "referral_partners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referralSlug" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "feePerSession" DECIMAL(10,2) NOT NULL DEFAULT 3000,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalReferred" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_partners_email_key" ON "referral_partners"("email");
CREATE UNIQUE INDEX "referral_partners_referralCode_key" ON "referral_partners"("referralCode");
CREATE UNIQUE INDEX "referral_partners_referralSlug_key" ON "referral_partners"("referralSlug");

CREATE TABLE "referral_payouts" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "reference" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "referral_payouts_partnerId_idx" ON "referral_payouts"("partnerId");
CREATE INDEX "referral_payouts_status_idx" ON "referral_payouts"("status");

ALTER TABLE "referral_payouts" ADD CONSTRAINT "referral_payouts_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "referral_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "therapy_bookings"
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
  ADD COLUMN IF NOT EXISTS "referralPartnerId" UUID,
  ADD COLUMN IF NOT EXISTS "isReferral" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'therapy_bookings_referralPartnerId_fkey'
  ) THEN
    ALTER TABLE "therapy_bookings" ADD CONSTRAINT "therapy_bookings_referralPartnerId_fkey"
      FOREIGN KEY ("referralPartnerId") REFERENCES "referral_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE "referral_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnerId" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payoutId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referral_sessions_bookingId_key" ON "referral_sessions"("bookingId");
CREATE INDEX "referral_sessions_partnerId_idx" ON "referral_sessions"("partnerId");
CREATE INDEX "referral_sessions_patientEmail_idx" ON "referral_sessions"("patientEmail");

ALTER TABLE "referral_sessions" ADD CONSTRAINT "referral_sessions_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "referral_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_sessions" ADD CONSTRAINT "referral_sessions_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "therapy_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referral_sessions" ADD CONSTRAINT "referral_sessions_payoutId_fkey"
  FOREIGN KEY ("payoutId") REFERENCES "referral_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
