-- CreateEnum
CREATE TYPE "RecallCampaignChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'MANUAL');

-- AlterTable
ALTER TABLE "RecallCampaign"
ADD COLUMN "channel" "RecallCampaignChannel" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "audienceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "messageTemplate" TEXT,
ADD COLUMN "templatePreview" TEXT,
ADD COLUMN "createdByUserId" TEXT;

-- CreateTable
CREATE TABLE "RecallCampaignPatient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "recallStatus" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallCampaignPatient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecallCampaign_tenantId_createdAt_idx" ON "RecallCampaign"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "RecallCampaign_tenantId_channel_idx" ON "RecallCampaign"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "RecallCampaign_createdByUserId_idx" ON "RecallCampaign"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecallCampaignPatient_tenantId_campaignId_patientId_key" ON "RecallCampaignPatient"("tenantId", "campaignId", "patientId");

-- CreateIndex
CREATE INDEX "RecallCampaignPatient_tenantId_campaignId_idx" ON "RecallCampaignPatient"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "RecallCampaignPatient_tenantId_patientId_idx" ON "RecallCampaignPatient"("tenantId", "patientId");

-- AddForeignKey
ALTER TABLE "RecallCampaign" ADD CONSTRAINT "RecallCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCampaignPatient" ADD CONSTRAINT "RecallCampaignPatient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCampaignPatient" ADD CONSTRAINT "RecallCampaignPatient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RecallCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCampaignPatient" ADD CONSTRAINT "RecallCampaignPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
