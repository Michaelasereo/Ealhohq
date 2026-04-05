-- Admin chat monitoring + SLA tracking + soft-delete resolution fields (idempotent)

ALTER TABLE "chat_threads" ADD COLUMN IF NOT EXISTS "slaPatientMessageId" UUID;
ALTER TABLE "chat_threads" ADD COLUMN IF NOT EXISTS "slaTherapistRemindedAt" TIMESTAMP(3);
ALTER TABLE "chat_threads" ADD COLUMN IF NOT EXISTS "slaAdminNotifiedAt" TIMESTAMP(3);
ALTER TABLE "chat_threads" ADD COLUMN IF NOT EXISTS "deletionScheduledAt" TIMESTAMP(3);

ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "isResolved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "resolvedBy" UUID;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "highRiskEscalatedAt" TIMESTAMP(3);
