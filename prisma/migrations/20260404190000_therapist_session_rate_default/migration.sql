-- Defensive backfill (columns are NOT NULL; safe if schema ever diverged)
UPDATE "therapy_therapists" SET "sessionRate" = 15000 WHERE "sessionRate" IS NULL;
UPDATE "therapy_therapists" SET "sessionDuration" = 50 WHERE "sessionDuration" IS NULL;

ALTER TABLE "therapy_therapists" ALTER COLUMN "sessionRate" SET DEFAULT 15000;
