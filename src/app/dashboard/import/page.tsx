import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PrivateRouteState } from "@/components/layout/private-route-state";
import { Badge } from "@/components/ui/badge";
import { PatientImportWorkflow } from "@/app/dashboard/import/patient-import-workflow";
import { isAuthBoundaryError, isDevelopmentAuthEnabled, requirePermission } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function PatientImportPage() {
  let tenant;

  try {
    tenant = await requirePermission("patient:import");
  } catch (error) {
    if (isAuthBoundaryError(error)) {
      return <PrivateRouteState error={error} />;
    }

    throw error;
  }

  const tenantName = tenant.tenantName ?? "Selected clinic";

  return (
    <DashboardShell tenant={tenant} isDemoMode={isDevelopmentAuthEnabled()}>
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge>{tenantName}</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">Import patient list</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Paste a clinic CSV, preview patient drafts, and prepare the data needed for recall
              automation. Valid rows can be saved to the tenant database when a local database is
              configured; raw CSV content is never stored. Receptionists can prepare the list while
              managers review import readiness.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/onboarding"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Onboarding steps
            </Link>
            <Link
              href="/dashboard/recall"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Review recall
            </Link>
          </div>
        </div>
      </div>

      <section className="p-6 lg:p-8">
        <PatientImportWorkflow />
      </section>
    </DashboardShell>
  );
}
