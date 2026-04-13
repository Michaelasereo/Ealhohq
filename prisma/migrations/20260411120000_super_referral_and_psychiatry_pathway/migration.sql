-- Super referral (corporate wellness) + psychiatry referral pathway (Week 1 schema)

-- ─── Super referral ─────────────────────────────────────────────

CREATE TABLE "super_referral_partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "referralSlug" TEXT NOT NULL,
    "monthlyPoolSize" INTEGER NOT NULL DEFAULT 0,
    "poolApprovedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_referral_partners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "super_referral_partners_referralSlug_key" ON "super_referral_partners"("referralSlug");

CREATE TABLE "partner_clients" (
    "id" UUID NOT NULL,
    "superReferralPartnerId" UUID NOT NULL,
    "userId" UUID,
    "clientType" TEXT NOT NULL,
    "monthlyCreditsRemaining" INTEGER NOT NULL DEFAULT 0,
    "onboardingStatus" TEXT NOT NULL DEFAULT 'pending',
    "csvUploadBatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_clients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_clients_superReferralPartnerId_idx" ON "partner_clients"("superReferralPartnerId");
CREATE INDEX "partner_clients_userId_idx" ON "partner_clients"("userId");

ALTER TABLE "partner_clients" ADD CONSTRAINT "partner_clients_superReferralPartnerId_fkey"
  FOREIGN KEY ("superReferralPartnerId") REFERENCES "super_referral_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_credit_allocations" (
    "id" UUID NOT NULL,
    "superReferralPartnerId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "totalPool" INTEGER NOT NULL,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "approvedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_credit_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_credit_allocations_superReferralPartnerId_month_key"
  ON "partner_credit_allocations"("superReferralPartnerId", "month");

ALTER TABLE "partner_credit_allocations" ADD CONSTRAINT "partner_credit_allocations_superReferralPartnerId_fkey"
  FOREIGN KEY ("superReferralPartnerId") REFERENCES "super_referral_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "therapy_patients" ADD COLUMN "partnerClientId" UUID;

CREATE UNIQUE INDEX "therapy_patients_partnerClientId_key" ON "therapy_patients"("partnerClientId");

ALTER TABLE "therapy_patients" ADD CONSTRAINT "therapy_patients_partnerClientId_fkey"
  FOREIGN KEY ("partnerClientId") REFERENCES "partner_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Psychiatry pathway ───────────────────────────────────────

CREATE TABLE "pharmacy_partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "psychiatrists" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "mdcnRegistrationNumber" TEXT NOT NULL,
    "specialisation" TEXT NOT NULL,
    "sessionRate" DECIMAL(10,2) NOT NULL,
    "pharmacyPartnerId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychiatrists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "psychiatrists_email_key" ON "psychiatrists"("email");

ALTER TABLE "psychiatrists" ADD CONSTRAINT "psychiatrists_pharmacyPartnerId_fkey"
  FOREIGN KEY ("pharmacyPartnerId") REFERENCES "pharmacy_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "psychiatrist_availability_schedules" (
    "id" UUID NOT NULL,
    "psychiatristId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 50,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "bookingWindowWeeks" INTEGER NOT NULL DEFAULT 4,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychiatrist_availability_schedules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "psychiatrist_availability_schedules" ADD CONSTRAINT "psychiatrist_availability_schedules_psychiatristId_fkey"
  FOREIGN KEY ("psychiatristId") REFERENCES "psychiatrists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "psychiatrist_availability_overrides" (
    "id" UUID NOT NULL,
    "psychiatristId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychiatrist_availability_overrides_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "psychiatrist_availability_overrides" ADD CONSTRAINT "psychiatrist_availability_overrides_psychiatristId_fkey"
  FOREIGN KEY ("psychiatristId") REFERENCES "psychiatrists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "psychiatric_referrals" (
    "id" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "therapySessionId" UUID NOT NULL,
    "clinicalReason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'flagged',
    "adminNotes" TEXT,
    "therapyBookingId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychiatric_referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "psychiatric_referrals_therapyBookingId_key" ON "psychiatric_referrals"("therapyBookingId");

CREATE INDEX "psychiatric_referrals_therapistId_idx" ON "psychiatric_referrals"("therapistId");
CREATE INDEX "psychiatric_referrals_patientId_idx" ON "psychiatric_referrals"("patientId");
CREATE INDEX "psychiatric_referrals_status_idx" ON "psychiatric_referrals"("status");

ALTER TABLE "psychiatric_referrals" ADD CONSTRAINT "psychiatric_referrals_therapistId_fkey"
  FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "psychiatric_referrals" ADD CONSTRAINT "psychiatric_referrals_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "psychiatric_referrals" ADD CONSTRAINT "psychiatric_referrals_therapySessionId_fkey"
  FOREIGN KEY ("therapySessionId") REFERENCES "therapy_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "psychiatric_referrals" ADD CONSTRAINT "psychiatric_referrals_therapyBookingId_fkey"
  FOREIGN KEY ("therapyBookingId") REFERENCES "therapy_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "psychiatric_sessions" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "psychiatristId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "referralId" UUID NOT NULL,
    "sessionNotes" TEXT,
    "summaryForTherapist" TEXT,
    "pharmacyPartnerId" UUID NOT NULL,
    "pharmacyCode" TEXT,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychiatric_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "psychiatric_sessions_bookingId_key" ON "psychiatric_sessions"("bookingId");
CREATE UNIQUE INDEX "psychiatric_sessions_referralId_key" ON "psychiatric_sessions"("referralId");
CREATE UNIQUE INDEX "psychiatric_sessions_pharmacyCode_key" ON "psychiatric_sessions"("pharmacyCode");

CREATE INDEX "psychiatric_sessions_psychiatristId_idx" ON "psychiatric_sessions"("psychiatristId");
CREATE INDEX "psychiatric_sessions_patientId_idx" ON "psychiatric_sessions"("patientId");

ALTER TABLE "psychiatric_sessions" ADD CONSTRAINT "psychiatric_sessions_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "therapy_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "psychiatric_sessions" ADD CONSTRAINT "psychiatric_sessions_psychiatristId_fkey"
  FOREIGN KEY ("psychiatristId") REFERENCES "psychiatrists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "psychiatric_sessions" ADD CONSTRAINT "psychiatric_sessions_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "psychiatric_sessions" ADD CONSTRAINT "psychiatric_sessions_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "psychiatric_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "psychiatric_sessions" ADD CONSTRAINT "psychiatric_sessions_pharmacyPartnerId_fkey"
  FOREIGN KEY ("pharmacyPartnerId") REFERENCES "pharmacy_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "psychiatric_prescriptions" (
    "id" UUID NOT NULL,
    "psychiatricSessionId" UUID NOT NULL,
    "medicationName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychiatric_prescriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "psychiatric_prescriptions_psychiatricSessionId_idx" ON "psychiatric_prescriptions"("psychiatricSessionId");

ALTER TABLE "psychiatric_prescriptions" ADD CONSTRAINT "psychiatric_prescriptions_psychiatricSessionId_fkey"
  FOREIGN KEY ("psychiatricSessionId") REFERENCES "psychiatric_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
