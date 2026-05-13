import { createTenantScopedWhere } from "@/modules/tenants";
import { getPrismaClient } from "@/server/db";

export type PatientImportBatchRecord = {
  id: string;
  tenantId: string;
  status: "DRAFT" | "VALIDATED" | "IMPORTED" | "FAILED" | "CANCELLED";
  source: string;
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  createdAt: Date;
};

export type PatientImportRepositoryDatabase = {
  patientImportBatch: {
    findFirst(args: Record<string, unknown>): Promise<PatientImportBatchRecord | null>;
  };
};

export async function getLatestPatientImportBatchForTenant(
  tenantId: string,
  options: { db?: PatientImportRepositoryDatabase } = {},
): Promise<PatientImportBatchRecord | null> {
  const db = (options.db ?? getPrismaClient()) as PatientImportRepositoryDatabase;

  return db.patientImportBatch.findFirst({
    where: createTenantScopedWhere(tenantId),
    orderBy: {
      createdAt: "desc",
    },
  });
}
