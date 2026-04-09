-- Subscribers + newsletter sends

CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" UUID NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "sequence" INTEGER NOT NULL DEFAULT 1,
  "lastEmailAt" TIMESTAMP(3),
  "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
  "unsubscribedAt" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'burnout_assessment',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_key" ON "subscribers"("email");
CREATE INDEX IF NOT EXISTS "subscribers_unsubscribed_sequence_idx" ON "subscribers"("unsubscribed", "sequence");
CREATE INDEX IF NOT EXISTS "subscribers_createdAt_idx" ON "subscribers"("createdAt");

CREATE TABLE IF NOT EXISTS "newsletter_sends" (
  "id" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "sentBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "newsletter_sends_pkey" PRIMARY KEY ("id")
);
