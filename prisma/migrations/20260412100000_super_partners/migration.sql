-- CreateTable
CREATE TABLE "super_partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_partners_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "super_referral_partners" ADD COLUMN "superPartnerId" UUID;

-- CreateIndex
CREATE INDEX "super_referral_partners_superPartnerId_idx" ON "super_referral_partners"("superPartnerId");

-- AddForeignKey
ALTER TABLE "super_referral_partners" ADD CONSTRAINT "super_referral_partners_superPartnerId_fkey" FOREIGN KEY ("superPartnerId") REFERENCES "super_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
