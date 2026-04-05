-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "clinic_leads" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "teamSize" TEXT NOT NULL,
    "interests" TEXT[],
    "whatsapp" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'landing_page',
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "clinic_leads_createdAt_idx" ON "clinic_leads"("createdAt");
CREATE INDEX IF NOT EXISTS "clinic_leads_contacted_idx" ON "clinic_leads"("contacted");
