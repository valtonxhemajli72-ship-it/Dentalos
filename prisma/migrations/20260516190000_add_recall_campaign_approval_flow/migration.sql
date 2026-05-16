-- AlterEnum
ALTER TYPE "RecallCampaignStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "RecallCampaignStatus" ADD VALUE 'APPROVED';
ALTER TYPE "RecallCampaignStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "RecallCampaign"
ADD COLUMN "reviewedByUserId" TEXT,
ADD COLUMN "cancelledByUserId" TEXT,
ADD COLUMN "submittedForReviewAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RecallCampaign_tenantId_updatedAt_idx" ON "RecallCampaign"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "RecallCampaign_reviewedByUserId_idx" ON "RecallCampaign"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "RecallCampaign_cancelledByUserId_idx" ON "RecallCampaign"("cancelledByUserId");

-- AddForeignKey
ALTER TABLE "RecallCampaign" ADD CONSTRAINT "RecallCampaign_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCampaign" ADD CONSTRAINT "RecallCampaign_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
