-- Psychiatry pathway: invitations, admin notifications, platform therapist seed,
-- psychiatrist profile link, nullable pharmacy on psychiatric_sessions, referral uniqueness.

-- ─── Platform therapist (for psychiatric_assessment bookings FK) ─────────
INSERT INTO "shared_profiles" (
  "id",
  "role",
  "fullName",
  "phone",
  "status",
  "guestMergeCompleted",
  "guestMergeBannerPending",
  "createdAt",
  "updatedAt"
)
SELECT
  'cafebabe-cafe-4afe-8afe-cafe00000001',
  'therapist',
  'Ealho Psychiatry (system)',
  NULL,
  'active',
  false,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "shared_profiles" WHERE "id" = 'cafebabe-cafe-4afe-8afe-cafe00000001'
);

INSERT INTO "therapy_therapists" (
  "id",
  "profileId",
  "bio",
  "specializations",
  "qualifications",
  "profilePhoto",
  "status",
  "sessionRate",
  "sessionDuration",
  "createdAt",
  "updatedAt"
)
SELECT
  'cafebabe-cafe-4afe-8afe-cafe00000002',
  'cafebabe-cafe-4afe-8afe-cafe00000001',
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  NULL,
  'approved',
  20000,
  60,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "therapy_therapists" WHERE "id" = 'cafebabe-cafe-4afe-8afe-cafe00000002'
);

-- ─── Pharmacy: default flag ───────────────────────────────────────────────
ALTER TABLE "pharmacy_partners" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- ─── Psychiatrist: extended fields + optional profile link ────────────────
ALTER TABLE "psychiatrists" ADD COLUMN IF NOT EXISTS "sessionDuration" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "psychiatrists" ADD COLUMN IF NOT EXISTS "profilePhoto" TEXT;
ALTER TABLE "psychiatrists" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "psychiatrists" ADD COLUMN IF NOT EXISTS "profileId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "psychiatrists_profileId_key" ON "psychiatrists"("profileId");

ALTER TABLE "psychiatrists" DROP CONSTRAINT IF EXISTS "psychiatrists_profileId_fkey";
ALTER TABLE "psychiatrists"
  ADD CONSTRAINT "psychiatrists_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "shared_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Psychiatric sessions: optional pharmacy + status fields ──────────────
ALTER TABLE "psychiatric_sessions" DROP CONSTRAINT IF EXISTS "psychiatric_sessions_pharmacyPartnerId_fkey";

ALTER TABLE "psychiatric_sessions" ALTER COLUMN "pharmacyPartnerId" DROP NOT NULL;

ALTER TABLE "psychiatric_sessions"
  ADD CONSTRAINT "psychiatric_sessions_pharmacyPartnerId_fkey"
  FOREIGN KEY ("pharmacyPartnerId") REFERENCES "pharmacy_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "psychiatric_sessions" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE "psychiatric_sessions" ADD COLUMN IF NOT EXISTS "prescriptionSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "psychiatric_sessions" ADD COLUMN IF NOT EXISTS "patientConsentedToShareNotes" BOOLEAN NOT NULL DEFAULT false;

-- ─── One referral per therapy session ───────────────────────────────────────
DELETE FROM "psychiatric_referrals" a
USING "psychiatric_referrals" b
WHERE a."therapySessionId" = b."therapySessionId"
  AND a."id"::text > b."id"::text;

CREATE UNIQUE INDEX IF NOT EXISTS "psychiatric_referrals_therapySessionId_key" ON "psychiatric_referrals"("therapySessionId");

-- ─── Invitations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "psychiatric_invitations" (
    "id" UUID NOT NULL,
    "psychiatricSessionId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psychiatric_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "psychiatric_invitations_psychiatricSessionId_key"
  ON "psychiatric_invitations"("psychiatricSessionId");

CREATE INDEX IF NOT EXISTS "psychiatric_invitations_patientId_idx" ON "psychiatric_invitations"("patientId");

ALTER TABLE "psychiatric_invitations" DROP CONSTRAINT IF EXISTS "psychiatric_invitations_psychiatricSessionId_fkey";
ALTER TABLE "psychiatric_invitations"
  ADD CONSTRAINT "psychiatric_invitations_psychiatricSessionId_fkey"
  FOREIGN KEY ("psychiatricSessionId") REFERENCES "psychiatric_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "psychiatric_invitations" DROP CONSTRAINT IF EXISTS "psychiatric_invitations_patientId_fkey";
ALTER TABLE "psychiatric_invitations"
  ADD CONSTRAINT "psychiatric_invitations_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Admin notifications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "admin_notifications" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceId" UUID,
    "resourceType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "admin_notifications_isRead_idx" ON "admin_notifications"("isRead");
CREATE INDEX IF NOT EXISTS "admin_notifications_createdAt_idx" ON "admin_notifications"("createdAt");
