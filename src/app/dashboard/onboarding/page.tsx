import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PrivateRouteState } from "@/components/layout/private-route-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import {
  isAuthBoundaryError,
  isDemoTenantContext,
  isDevelopmentAuthEnabled,
  requirePermission,
} from "@/server/auth";

export const dynamic = "force-dynamic";

const onboardingSteps = [
  {
    step: "1",
    title: "Clinic profile",
    detail:
      "Confirm the tenant, pilot owner, contact policy, and who is allowed to review patient outreach.",
    href: "/dashboard",
    cta: "Open dashboard",
  },
  {
    step: "2",
    title: "Import patients",
    detail:
      "Paste a patient CSV, check validation results, and prepare patient drafts without storing raw CSV content.",
    href: "/dashboard/import",
    cta: "Import patient list",
  },
  {
    step: "3",
    title: "Review recall opportunities",
    detail:
      "Identify overdue recall patients, already scheduled patients, and people who need manual review.",
    href: "/dashboard/recall",
    cta: "Review recall queue",
  },
  {
    step: "4",
    title: "Prepare first campaign",
    detail:
      "Build a campaign draft from ready patients. Messages stay unsent until approval and delivery adapters exist.",
    href: "/dashboard/recall",
    cta: "Prepare campaign",
  },
];

export default async function OnboardingPage() {
  let tenant;

  try {
    tenant = await requirePermission("settings:read");
  } catch (error) {
    if (isAuthBoundaryError(error)) {
      return <PrivateRouteState error={error} />;
    }

    throw error;
  }

  return (
    <DashboardShell
      tenant={tenant}
      isDemoMode={isDevelopmentAuthEnabled() && isDemoTenantContext(tenant)}
    >
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <Badge>Pilot onboarding</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Clinic onboarding workflow</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          A practical four-step path for showing a clinic how {APP_NAME} turns a patient list into a
          recall follow-up queue for receptionists, doctors, managers, and administrative staff.
          Real authentication, sending, payments, and AI calls are not part of this MVP flow.
        </p>
      </div>

      <section className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4 lg:p-8">
        {onboardingSteps.map((step) => (
          <Card key={step.step}>
            <div className="flex h-full min-h-64 flex-col justify-between">
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-sm font-semibold text-brand-700">
                  {step.step}
                </div>
                <h2 className="mt-5 text-lg font-semibold text-ink">{step.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{step.detail}</p>
              </div>
              <Link
                href={step.href}
                className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
              >
                {step.cta}
              </Link>
            </div>
          </Card>
        ))}
      </section>
    </DashboardShell>
  );
}
