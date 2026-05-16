CREATE TYPE "TenantSetupStatus" AS ENUM ('PENDING', 'BOOTSTRAPPED');

ALTER TABLE "Tenant"
  ADD COLUMN "setupStatus" "TenantSetupStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

CREATE INDEX "Tenant_setupStatus_idx" ON "Tenant"("setupStatus");
