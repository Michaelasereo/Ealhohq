-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "admin_app_settings" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_app_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "admin_app_settings" ("id", "payload", "updatedAt")
VALUES ('default', '{}', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
