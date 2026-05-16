import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PrivateRouteState } from "@/components/layout/private-route-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  listDemoRecallCandidatesForTenant,
  listPatientsForTenant,
  mapRecallPatientToPatientListItem,
  type PatientListItem,
} from "@/modules/patients/repository";
import {
  isAuthBoundaryError,
  isDemoTenantContext,
  isDevelopmentAuthEnabled,
  requirePermission,
} from "@/server/auth";
import { DatabaseUnavailableError } from "@/server/db";
import type { TenantContext } from "@/modules/tenants";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

type PatientsPageData = {
  patients: PatientListItem[];
  source: "database" | "demo" | "unavailable";
  tenantName: string;
};

export default async function PatientsPage() {
  let tenant: TenantContext;

  try {
    tenant = await requirePermission("patient:read");
  } catch (error) {
    if (isAuthBoundaryError(error)) {
      return <PrivateRouteState error={error} />;
    }

    throw error;
  }

  const data = await getPatientsPageData(tenant);

  return (
    <DashboardShell
      tenant={tenant}
      isDemoMode={isDevelopmentAuthEnabled() && isDemoTenantContext(tenant)}
    >
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge>{data.tenantName}</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">Patients</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Tenant-scoped patient records for recall onboarding. Contact details stay masked in
              operational views so staff can work from status and availability without exposing
              unnecessary patient details.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/import"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Import patients
            </Link>
            <Link
              href="/dashboard/recall"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Review recall
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-4 p-6 md:grid-cols-3 lg:p-8">
        <Card>
          <p className="text-sm font-semibold text-ink">Data source</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{data.source}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Demo fallback appears only when database access is unavailable.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Patients loaded</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{data.patients.length}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Every database read is scoped by tenant.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Recall-ready view</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">
            {data.patients.filter((patient) => patient.lifecycleStatus !== "active").length}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Import patients, then review who needs follow-up.
          </p>
        </Card>
      </section>

      <section className="px-6 pb-8 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Patient list</h2>
            <p className="mt-1 text-sm text-muted">
              Names are shown as patient initials and contact methods are summarized.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-surface text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Recall status</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Last visit</th>
                  <th className="px-5 py-3">Next appointment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.patients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-5 py-4 font-semibold text-ink">{patient.displayName}</td>
                    <td className="px-5 py-4 text-muted">
                      {formatStatus(patient.lifecycleStatus)}
                    </td>
                    <td className="px-5 py-4 text-muted">{patient.contactIndicators.join(", ")}</td>
                    <td className="px-5 py-4 text-muted">{formatDate(patient.lastVisitAt)}</td>
                    <td className="px-5 py-4 text-muted">
                      {formatDate(patient.nextAppointmentAt)}
                    </td>
                  </tr>
                ))}
                {data.patients.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-sm text-muted" colSpan={5}>
                      No patients found for this tenant. Start with a patient import.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

async function getPatientsPageData(tenant: TenantContext): Promise<PatientsPageData> {
  try {
    const patients = await listPatientsForTenant(tenant.tenantId);
    return {
      patients,
      source: "database",
      tenantName: tenant.tenantName ?? "Selected clinic",
    };
  } catch (error) {
    if (!canUseDemoFallback(tenant)) {
      if (error instanceof DatabaseUnavailableError) {
        return {
          patients: [],
          source: "unavailable",
          tenantName: tenant.tenantName ?? "Selected clinic",
        };
      }

      throw error;
    }

    return {
      patients: listDemoRecallCandidatesForTenant(tenant.tenantId).map(
        mapRecallPatientToPatientListItem,
      ),
      source: "demo",
      tenantName: tenant.tenantName ?? "Selected clinic",
    };
  }
}

function canUseDemoFallback(tenant: TenantContext): boolean {
  return isDevelopmentAuthEnabled() && isDemoTenantContext(tenant);
}

function formatDate(date: Date | undefined): string {
  return date ? dateFormatter.format(date) : "Not set";
}

function formatStatus(status: PatientListItem["lifecycleStatus"]): string {
  return status.replaceAll("_", " ");
}
