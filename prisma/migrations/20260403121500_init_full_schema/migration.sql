-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "shared_profiles" (
    "id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_therapists" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "bio" TEXT,
    "specializations" TEXT[],
    "qualifications" TEXT[],
    "profilePhoto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sessionRate" DECIMAL(10,2) NOT NULL,
    "sessionDuration" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_therapists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_patients" (
    "id" UUID NOT NULL,
    "profileId" UUID,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_medical_history" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "currentMedications" TEXT,
    "allergies" TEXT,
    "previousDiagnoses" TEXT,
    "previousTherapy" TEXT,
    "familyMedical" TEXT,
    "familyPsychiatric" TEXT,
    "familySubstanceUse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_medical_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_availability_schedules" (
    "id" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 50,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "bookingWindowWeeks" INTEGER NOT NULL DEFAULT 4,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_availability_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_availability_overrides" (
    "id" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_bookings" (
    "id" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "patientId" UUID,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "agoraRoomId" TEXT,
    "agoraRoomToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "paystackReference" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "sessionType" TEXT NOT NULL DEFAULT 'followup',
    "paidWithCredits" BOOLEAN NOT NULL DEFAULT false,
    "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
    "reminder1hSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_sessions" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "patientId" UUID,
    "sessionNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "format" TEXT NOT NULL DEFAULT 'telehealth',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "agoraTranscript" TEXT,
    "notesGenerated" BOOLEAN NOT NULL DEFAULT false,
    "notesGeneratedAt" TIMESTAMP(3),
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_session_notes" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "noteType" TEXT NOT NULL,
    "noteContent" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_session_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_credits" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_credit_transactions" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_feedback" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "mood" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "therapy_therapists_profileId_key" ON "therapy_therapists"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "therapy_patients_profileId_key" ON "therapy_patients"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "therapy_medical_history_patientId_key" ON "therapy_medical_history"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "therapy_sessions_bookingId_key" ON "therapy_sessions"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "therapy_session_notes_sessionId_key" ON "therapy_session_notes"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "therapy_credits_patientId_key" ON "therapy_credits"("patientId");

-- AddForeignKey
ALTER TABLE "therapy_therapists" ADD CONSTRAINT "therapy_therapists_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "shared_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_patients" ADD CONSTRAINT "therapy_patients_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "shared_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_medical_history" ADD CONSTRAINT "therapy_medical_history_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_availability_schedules" ADD CONSTRAINT "therapy_availability_schedules_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_availability_overrides" ADD CONSTRAINT "therapy_availability_overrides_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_bookings" ADD CONSTRAINT "therapy_bookings_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_bookings" ADD CONSTRAINT "therapy_bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "therapy_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_session_notes" ADD CONSTRAINT "therapy_session_notes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "therapy_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_session_notes" ADD CONSTRAINT "therapy_session_notes_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_credits" ADD CONSTRAINT "therapy_credits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_credit_transactions" ADD CONSTRAINT "therapy_credit_transactions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_feedback" ADD CONSTRAINT "therapy_feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "therapy_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

