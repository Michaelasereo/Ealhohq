-- Rebooking (therapist-initiated invites) — model existed in schema but table was missing from initial migrations.

CREATE TABLE "therapy_rebooking_requests" (
    "id" UUID NOT NULL,
    "therapistId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "bookingId" UUID,
    "suggestedDate" TIMESTAMP(3) NOT NULL,
    "suggestedTime" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'followup',
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_rebooking_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "therapy_rebooking_requests_bookingId_key" ON "therapy_rebooking_requests"("bookingId");

ALTER TABLE "therapy_rebooking_requests" ADD CONSTRAINT "therapy_rebooking_requests_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "therapy_therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "therapy_rebooking_requests" ADD CONSTRAINT "therapy_rebooking_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "therapy_patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "therapy_rebooking_requests" ADD CONSTRAINT "therapy_rebooking_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "therapy_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
