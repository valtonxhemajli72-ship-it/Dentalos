import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PrivateRouteState } from "@/components/layout/private-route-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  createPatientImportClientPreview,
  patientImportExampleCsv,
} from "@/modules/patient-import";
import { getLatestPatientImportBatchForTenant } from "@/modules/patient-import/repository";
import {
  listDemoRecallCandidatesForTenant,
  listRecallCandidatesForTenant,
  type PatientRepositoryDatabase,
} from "@/modules/patients/repository";
import {
  buildRecallWorkspaceSnapshot,
  type RecallAction,
  type RecallQueueItem,
  type RecallStatus,
} from "@/modules/patients/recall";
import {
  isAuthBoundaryError,
  isDemoTenantContext,
  isDevelopmentAuthEnabled,
  requirePermission,
} from "@/server/auth";
import { roleHasPermission } from "@/server/auth/permissions";
import { createRecallCandidatesViewedAuditEvent, writeAuditEvent } from "@/server/audit";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";
import type { PatientImportRepositoryDatabase } from "@/modules/patient-import/repository";
import type { TenantContext } from "@/modules/tenants";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const statusLabels: Record<RecallStatus, string> = {
  overdue: "Overdue",
  due_now: "Due now",
  due_soon: "Due soon",
  scheduled: "Scheduled",
  not_ready: "Not ready",
};

const statusClasses: Record<RecallStatus, string> = {
  overdue: "bg-rose-50 text-clinic-rose",
  due_now: "bg-amber-50 text-clinic-amber",
  due_soon: "bg-brand-50 text-brand-700",
  scheduled: "bg-blue-50 text-clinic-blue",
  not_ready: "bg-surface text-muted",
};

const actionLabels: Record<RecallAction, string> = {
  call_to_schedule: "Call to schedule",
  send_recall_message: "Prepare recall message",
  send_gentle_nudge: "Gentle follow-up",
  confirm_upcoming_visit: "Confirm appointment",
  wait: "Wait",
};

export default async function RecallDashboardPage() {
  let tenant: TenantContext;

  try {
    tenant = await requirePermission("recall:read");
  } catch (error) {
    if (isAuthBoundaryError(error)) {
      return <PrivateRouteState error={error} />;
    }

    throw error;
  }

  const data = await getRecallPageData(tenant);
  const snapshot = buildRecallWorkspaceSnapshot(data.candidates, data.asOf);
  const actionablePatients = snapshot.queue.filter((item) =>
    ["call_to_schedule", "send_recall_message", "send_gentle_nudge"].includes(
      item.recommendedAction,
    ),
  );
  const hasPatients = snapshot.summary.totalPatients > 0;
  const canPrepareCampaign = roleHasPermission(tenant.role, "campaign:prepare");

  return (
    <DashboardShell
      tenant={tenant}
      isDemoMode={isDevelopmentAuthEnabled() && isDemoTenantContext(tenant)}
    >
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge>{data.tenantName}</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">Patient recall queue</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Prioritize patients who are due or overdue, separate safe campaign work from manual
              review, and keep tenant-owned patient data behind the module boundary. Doctors can
              review care context while receptionists prepare scheduling work.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/import"
              className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Import patients
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-4 p-6 pb-0 md:grid-cols-4 lg:p-8 lg:pb-0">
        <Card>
          <p className="text-sm font-semibold text-ink">Data source</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{data.source}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Demo fallback appears only when database access is unavailable.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Import readiness</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">
            {data.importReadiness.validRowCount} drafts
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Last import status: {data.importReadiness.status}.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Recall candidates</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{actionablePatients.length}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Candidates are prioritized before any patient-facing message is prepared.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Campaign readiness</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">
            {snapshot.campaignDraft.readyToContact}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Ready patients can be moved into a campaign draft after review.
          </p>
        </Card>
      </section>

      <section className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5 lg:p-8">
        <MetricCard label="Total patients" value={snapshot.summary.totalPatients} />
        <MetricCard label="Overdue" value={snapshot.summary.overdue} tone="rose" />
        <MetricCard label="Due now" value={snapshot.summary.dueNow} tone="amber" />
        <MetricCard label="Due soon" value={snapshot.summary.dueSoon} tone="brand" />
        <MetricCard label="Needs review" value={snapshot.summary.needsReview} />
      </section>

      <section className="grid gap-6 px-6 pb-8 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Prioritized recall worklist</h2>
            <p className="mt-1 text-sm text-muted">
              Queue calculated as of {dateFormatter.format(snapshot.asOf)}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-surface text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Recall due</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Recommended action</th>
                  <th className="px-5 py-3 text-right">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {snapshot.queue.map((patient) => (
                  <RecallTableRow key={patient.id} patient={patient} />
                ))}
                {snapshot.queue.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-sm text-muted" colSpan={6}>
                      No recall candidates found for this tenant. Import patients to start the
                      review queue.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="text-base font-semibold text-ink">Campaign draft</h2>
            <dl className="mt-5 space-y-4">
              <DefinitionItem label="Name" value={snapshot.campaignDraft.name} />
              <DefinitionItem label="Audience" value={snapshot.campaignDraft.audience} />
              <DefinitionItem
                label="Ready to contact"
                value={`${snapshot.campaignDraft.readyToContact} patients`}
              />
              <DefinitionItem
                label="Manual review"
                value={`${snapshot.campaignDraft.reviewRequired} patients`}
              />
            </dl>
            <div className="mt-5 rounded-md border border-line bg-surface p-4 text-sm leading-6 text-muted">
              Sending is intentionally not implemented yet. The MVP prepares safe worklists first;
              delivery adapters come after auth, tenant resolution, and approval flows.
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                disabled
                className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white opacity-60"
              >
                {canPrepareCampaign ? "Prepare campaign draft" : "Campaign permission required"}
              </button>
              <Link
                href="/dashboard/import"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
              >
                {hasPatients ? "Review import data" : "Import patients first"}
              </Link>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-ink">Actionable today</h2>
            <div className="mt-4 space-y-3">
              {actionablePatients.map((patient) => (
                <div
                  key={patient.id}
                  className="rounded-md border border-line bg-surface px-3 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-ink">{patient.displayName}</span>
                    <span className="text-xs font-semibold text-muted">
                      {patient.priorityScore}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">{actionLabels[patient.recommendedAction]}</p>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </section>
    </DashboardShell>
  );
}

type RecallPageData = {
  asOf: Date;
  candidates: Parameters<typeof buildRecallWorkspaceSnapshot>[0];
  source: "database" | "demo" | "unavailable";
  tenantName: string;
  importReadiness: {
    status: string;
    rowCount: number;
    validRowCount: number;
    invalidRowCount: number;
  };
};

async function getRecallPageData(tenant: TenantContext): Promise<RecallPageData> {
  const asOf = new Date();

  try {
    const db = getPrismaClient();
    const [candidates, latestImport] = await Promise.all([
      listRecallCandidatesForTenant(tenant.tenantId, asOf, {
        db: db as unknown as PatientRepositoryDatabase,
      }),
      getLatestPatientImportBatchForTenant(tenant.tenantId, {
        db: db as unknown as PatientImportRepositoryDatabase,
      }),
    ]);

    try {
      await writeAuditEvent(
        db,
        createRecallCandidatesViewedAuditEvent(tenant, {
          candidateCount: candidates.length,
          source: "database",
        }),
      );
    } catch {
      // Recall viewing must not fail just because audit persistence is unavailable locally.
    }

    return {
      asOf,
      candidates,
      source: "database",
      tenantName: tenant.tenantName ?? "Selected clinic",
      importReadiness: latestImport
        ? {
            status: latestImport.status,
            rowCount: latestImport.rowCount,
            validRowCount: latestImport.validRowCount,
            invalidRowCount: latestImport.invalidRowCount,
          }
        : {
            status: "No import batch",
            rowCount: 0,
            validRowCount: 0,
            invalidRowCount: 0,
          },
    };
  } catch (error) {
    if (!canUseDemoFallback(tenant)) {
      if (error instanceof DatabaseUnavailableError) {
        return {
          asOf,
          candidates: [],
          source: "unavailable",
          tenantName: tenant.tenantName ?? "Selected clinic",
          importReadiness: {
            status: "Unavailable",
            rowCount: 0,
            validRowCount: 0,
            invalidRowCount: 0,
          },
        };
      }

      throw error;
    }

    const demoPreview = createPatientImportClientPreview(patientImportExampleCsv);
    const candidates = listDemoRecallCandidatesForTenant(tenant.tenantId);

    return {
      asOf,
      candidates,
      source: "demo",
      tenantName: tenant.tenantName ?? "Selected clinic",
      importReadiness: {
        status: "Demo preview",
        rowCount: demoPreview.summary.rowCount,
        validRowCount: demoPreview.summary.validRowCount,
        invalidRowCount: demoPreview.summary.invalidRowCount,
      },
    };
  }
}

function canUseDemoFallback(tenant: TenantContext): boolean {
  return isDevelopmentAuthEnabled() && isDemoTenantContext(tenant);
}

type MetricCardProps = {
  label: string;
  value: number;
  tone?: "brand" | "amber" | "rose";
};

function MetricCard({ label, value, tone = "brand" }: MetricCardProps) {
  const toneClass = {
    brand: "text-brand-700",
    amber: "text-clinic-amber",
    rose: "text-clinic-rose",
  }[tone];

  return (
    <Card>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </Card>
  );
}

type RecallTableRowProps = {
  patient: RecallQueueItem;
};

function RecallTableRow({ patient }: RecallTableRowProps) {
  return (
    <tr>
      <td className="px-5 py-4">
        <div className="font-semibold text-ink">{patient.displayName}</div>
        <div className="mt-1 max-w-56 text-xs leading-5 text-muted">{patient.riskNote}</div>
      </td>
      <td className="px-5 py-4 text-muted">
        <div>{formatDueDate(patient)}</div>
        <div className="mt-1 text-xs">{formatDueDistance(patient.daysUntilDue)}</div>
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${statusClasses[patient.status]}`}
        >
          {statusLabels[patient.status]}
        </span>
      </td>
      <td className="px-5 py-4 text-muted">{patient.preferredChannel.toUpperCase()}</td>
      <td className="px-5 py-4 text-muted">{actionLabels[patient.recommendedAction]}</td>
      <td className="px-5 py-4 text-right font-semibold text-ink">{patient.priorityScore}</td>
    </tr>
  );
}

type DefinitionItemProps = {
  label: string;
  value: string;
};

function DefinitionItem({ label, value }: DefinitionItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function formatDueDate(patient: RecallQueueItem): string {
  if (!patient.nextRecallDueAt) {
    return "Not set";
  }

  return dateFormatter.format(patient.nextRecallDueAt);
}

function formatDueDistance(daysUntilDue: number): string {
  if (!Number.isFinite(daysUntilDue)) {
    return "No recall date";
  }

  if (daysUntilDue < 0) {
    return `${Math.abs(daysUntilDue)} days overdue`;
  }

  if (daysUntilDue === 0) {
    return "Due today";
  }

  return `Due in ${daysUntilDue} days`;
}
