"use server";

import { DEMO_TENANT_NAME } from "@/lib/constants";
import {
  createPatientImportClientPreview,
  createPatientImportPreview,
  type PatientImportClientPreview,
  type PatientImportNormalizedRow,
} from "@/modules/patient-import";
import {
  createPatientsForTenant,
  findPotentialDuplicatePatientsForTenant,
  type PatientRepositoryDatabase,
} from "@/modules/patients/repository";
import type { TenantContext } from "@/modules/tenants";
import {
  createPatientImportFailedAuditEvent,
  createPatientImportImportedAuditEvent,
  createPatientImportPreviewedAuditEvent,
  writeAuditEvent,
  type AuditLogDatabase,
} from "@/server/audit";
import {
  describeAuthBoundaryError,
  isAuthBoundaryError,
  isDevelopmentAuthEnabled,
  requirePermission,
} from "@/server/auth";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";

export type PatientImportPersistenceResult = {
  batchId?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  createdPatients: number;
  skippedRows: number;
  source: "database" | "unavailable";
};

export type PatientImportActionResult = {
  ok: boolean;
  message: string;
  preview: PatientImportClientPreview;
  persistence?: PatientImportPersistenceResult;
};

type ImportPersistenceTransaction = PatientRepositoryDatabase &
  AuditLogDatabase & {
    patientImportBatch: {
      create(args: Record<string, unknown>): Promise<{ id: string }>;
    };
  };

type ImportPersistenceDatabase = ImportPersistenceTransaction & {
  tenant: {
    upsert(args: Record<string, unknown>): Promise<unknown>;
  };
  user: {
    upsert(args: Record<string, unknown>): Promise<unknown>;
  };
  membership: {
    upsert(args: Record<string, unknown>): Promise<unknown>;
  };
  $transaction<T>(handler: (tx: ImportPersistenceTransaction) => Promise<T>): Promise<T>;
};

export async function previewPatientImportAction(
  csvText: string,
): Promise<PatientImportActionResult> {
  const tenant = await requireImportPermissionOrReturn();

  if ("ok" in tenant) {
    return tenant;
  }

  const preview = createPatientImportPreview(csvText);
  const clientPreview = createPatientImportClientPreview(csvText);

  try {
    const db = getPrismaClient() as unknown as ImportPersistenceDatabase;
    await ensureDevelopmentTenantForPersistence(db, tenant);
    await writeAuditEvent(
      db,
      createPatientImportPreviewedAuditEvent(tenant, {
        rowCount: preview.summary.rowCount,
        validRowCount: preview.summary.validRowCount,
        invalidRowCount: preview.summary.invalidRowCount,
      }),
    );
  } catch (error) {
    if (!(error instanceof DatabaseUnavailableError)) {
      return {
        ok: true,
        message: "Preview completed. Audit persistence is unavailable in this environment.",
        preview: clientPreview,
      };
    }
  }

  return {
    ok: true,
    message: "Preview completed. No messages were sent.",
    preview: clientPreview,
  };
}

export async function persistPatientImportAction(
  csvText: string,
): Promise<PatientImportActionResult> {
  const tenant = await requireImportPermissionOrReturn();

  if ("ok" in tenant) {
    return tenant;
  }

  const preview = createPatientImportPreview(csvText);
  const clientPreview = createPatientImportClientPreview(csvText);
  const duplicateRowsInsideBatch = preview.summary.duplicateRowCount;

  let db: ImportPersistenceDatabase;

  try {
    db = getPrismaClient() as unknown as ImportPersistenceDatabase;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return {
        ok: false,
        message: "Database is not configured. Preview is available, but patients were not saved.",
        preview: clientPreview,
        persistence: {
          totalRows: preview.summary.rowCount,
          validRows: preview.summary.validRowCount,
          invalidRows: preview.summary.invalidRowCount,
          duplicateRows: duplicateRowsInsideBatch,
          createdPatients: 0,
          skippedRows: preview.summary.invalidRowCount + duplicateRowsInsideBatch,
          source: "unavailable",
        },
      };
    }

    throw error;
  }

  let duplicateRows = duplicateRowsInsideBatch;
  let skippedRows = preview.summary.invalidRowCount + duplicateRowsInsideBatch;
  let validRows = preview.summary.validRowCount;

  try {
    await ensureDevelopmentTenantForPersistence(db, tenant);

    const validPreviewRows = preview.rows.filter((row) => row.issues.length === 0);
    const validNormalizedRows: PatientImportNormalizedRow[] = preview.drafts.map(
      (draft, index) => ({
        rowNumber: validPreviewRows[index]?.rowNumber ?? index + 2,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phone: draft.phone,
        lastVisitDate: draft.lastVisitAt?.toISOString().slice(0, 10),
        nextAppointmentDate: draft.nextAppointmentAt?.toISOString().slice(0, 10),
        preferredContactChannel: draft.preferredContactChannel,
        notes: draft.notes,
      }),
    );
    const duplicateMatches = await findPotentialDuplicatePatientsForTenant(
      tenant.tenantId,
      validNormalizedRows,
      { db },
    );
    const duplicateRowNumbers = new Set(duplicateMatches.map((match) => match.rowNumber));
    const validRowsForCreation = preview.drafts.filter((_, index) => {
      const rowNumber = validPreviewRows[index]?.rowNumber;
      return rowNumber ? !duplicateRowNumbers.has(rowNumber) : true;
    });

    duplicateRows = duplicateRowNumbers.size + duplicateRowsInsideBatch;
    skippedRows = preview.summary.invalidRowCount + duplicateRows;
    validRows = Math.max(0, preview.summary.validRowCount - duplicateRowNumbers.size);

    const result = await db.$transaction(async (tx) => {
      const batch = await tx.patientImportBatch.create({
        data: {
          tenantId: tenant.tenantId,
          createdByUserId: tenant.userId,
          status: validRowsForCreation.length > 0 ? "IMPORTED" : "VALIDATED",
          source: "pasted_csv",
          rowCount: preview.summary.rowCount,
          validRowCount: validRows,
          invalidRowCount: skippedRows,
        },
      });

      const createResult =
        validRowsForCreation.length > 0
          ? await createPatientsForTenant(tenant.tenantId, validRowsForCreation, tenant.userId, {
              db: tx,
            })
          : { count: 0 };

      await writeAuditEvent(
        tx,
        createPatientImportImportedAuditEvent(tenant, batch.id, {
          totalRows: preview.summary.rowCount,
          validRows,
          invalidRows: preview.summary.invalidRowCount,
          duplicateRows,
          createdPatients: createResult.count,
          skippedRows,
        }),
      );

      return {
        batchId: batch.id,
        createdPatients: createResult.count,
      };
    });

    return {
      ok: true,
      message: `${result.createdPatients} patient records saved. No messages were sent.`,
      preview: clientPreview,
      persistence: {
        batchId: result.batchId,
        totalRows: preview.summary.rowCount,
        validRows,
        invalidRows: preview.summary.invalidRowCount,
        duplicateRows,
        createdPatients: result.createdPatients,
        skippedRows,
        source: "database",
      },
    };
  } catch {
    await tryWriteImportFailedAuditEvent(db, tenant, {
      totalRows: preview.summary.rowCount,
      validRows,
      invalidRows: preview.summary.invalidRowCount,
      duplicateRows,
    });

    return {
      ok: false,
      message: "Import persistence failed. No raw CSV was stored.",
      preview: clientPreview,
      persistence: {
        totalRows: preview.summary.rowCount,
        validRows,
        invalidRows: preview.summary.invalidRowCount,
        duplicateRows,
        createdPatients: 0,
        skippedRows,
        source: "database",
      },
    };
  }
}

async function requireImportPermissionOrReturn(): Promise<
  TenantContext | PatientImportActionResult
> {
  try {
    return await requirePermission("patient:import");
  } catch (error) {
    if (!isAuthBoundaryError(error)) {
      throw error;
    }

    return {
      ok: false,
      message: describeAuthBoundaryError(error),
      preview: createPatientImportClientPreview(""),
    };
  }
}

async function ensureDevelopmentTenantForPersistence(
  db: ImportPersistenceDatabase,
  tenant: TenantContext,
) {
  if (!isDevelopmentAuthEnabled()) {
    return;
  }

  await db.tenant.upsert({
    where: { id: tenant.tenantId },
    update: {
      name: DEMO_TENANT_NAME,
      slug: "klinika360-demo",
    },
    create: {
      id: tenant.tenantId,
      name: DEMO_TENANT_NAME,
      slug: "klinika360-demo",
    },
  });

  await db.user.upsert({
    where: { id: tenant.userId },
    update: {
      email: tenant.userEmail ?? "demo-user@example.test",
      name: "Klinika360 Demo User",
    },
    create: {
      id: tenant.userId,
      email: tenant.userEmail ?? "demo-user@example.test",
      name: "Klinika360 Demo User",
    },
  });

  await db.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.tenantId,
        userId: tenant.userId,
      },
    },
    update: {
      role: tenant.role,
    },
    create: {
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      role: tenant.role,
    },
  });
}

async function tryWriteImportFailedAuditEvent(
  db: AuditLogDatabase,
  tenant: TenantContext,
  metadata: { totalRows: number; validRows: number; invalidRows: number; duplicateRows: number },
) {
  try {
    await writeAuditEvent(db, createPatientImportFailedAuditEvent(tenant, metadata));
  } catch {
    // Failure audit is best-effort; never leak import payloads while reporting persistence failure.
  }
}
