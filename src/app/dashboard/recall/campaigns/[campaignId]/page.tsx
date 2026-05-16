import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PrivateRouteState } from "@/components/layout/private-route-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getRecallCampaignReviewStateForTenant,
  type RecallCampaignRepositoryDatabase,
} from "@/modules/recall/repository";
import {
  isAuthBoundaryError,
  isDemoTenantContext,
  isDevelopmentAuthEnabled,
  requirePermission,
} from "@/server/auth";
import { roleHasPermission } from "@/server/auth/permissions";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";
import type { TenantContext } from "@/modules/tenants";
import { RecallCampaignReviewForm } from "@/app/dashboard/recall/campaigns/[campaignId]/recall-campaign-review-form";

export const dynamic = "force-dynamic";

type RecallCampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function RecallCampaignDetailPage({ params }: RecallCampaignDetailPageProps) {
  let tenant: TenantContext;

  try {
    tenant = await requirePermission("campaign:prepare");
  } catch (error) {
    if (isAuthBoundaryError(error)) {
      return <PrivateRouteState error={error} />;
    }

    throw error;
  }

  const { campaignId } = await params;
  const data = await getCampaignDetailPageData(tenant, campaignId);

  if (data.status === "not-found") {
    notFound();
  }

  return (
    <DashboardShell
      tenant={tenant}
      isDemoMode={isDevelopmentAuthEnabled() && isDemoTenantContext(tenant)}
    >
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge>{tenant.tenantName ?? "Selected clinic"}</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">Review recall campaign</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Edit Draft campaign templates, submit them for review, and approve readiness without
              sending SMS, email, WhatsApp, or manual-call output.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/recall/campaigns/new"
              className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              New campaign
            </Link>
            <Link
              href="/dashboard/recall"
              className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Back to recall
            </Link>
          </div>
        </div>
      </div>

      <section className="p-6 lg:p-8">
        {data.status === "unavailable" ? (
          <Card>
            <h2 className="text-base font-semibold text-ink">Campaign review unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Campaign review requires a configured database. Production routes do not fall back to
              demo campaign records.
            </p>
          </Card>
        ) : (
          <RecallCampaignReviewForm
            reviewState={data.reviewState}
            canApproveByRole={roleHasPermission(tenant.role, "campaign:approve")}
          />
        )}
      </section>
    </DashboardShell>
  );
}

type CampaignDetailPageData =
  | {
      status: "ready";
      reviewState: NonNullable<Awaited<ReturnType<typeof getRecallCampaignReviewStateForTenant>>>;
    }
  | {
      status: "unavailable";
    }
  | {
      status: "not-found";
    };

async function getCampaignDetailPageData(
  tenant: TenantContext,
  campaignId: string,
): Promise<CampaignDetailPageData> {
  try {
    const db = getPrismaClient();
    const reviewState = await getRecallCampaignReviewStateForTenant(tenant.tenantId, campaignId, {
      db: db as unknown as RecallCampaignRepositoryDatabase,
    });

    return reviewState ? { status: "ready", reviewState } : { status: "not-found" };
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return { status: "unavailable" };
    }

    throw error;
  }
}
