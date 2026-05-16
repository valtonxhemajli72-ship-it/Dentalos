import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PrivateRouteState } from "@/components/layout/private-route-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { isCampaignEligibleCandidate, isDefaultCampaignCandidate } from "@/modules/recall";
import {
  listRecallCampaignsForTenant,
  type RecallCampaignRepositoryDatabase,
} from "@/modules/recall/repository";
import {
  isAuthBoundaryError,
  isDemoTenantContext,
  isDevelopmentAuthEnabled,
  requirePermission,
} from "@/server/auth";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";
import type { TenantContext } from "@/modules/tenants";
import {
  RecallCampaignBuilderForm,
  type CampaignBuilderCandidate,
} from "@/app/dashboard/recall/campaigns/new/recall-campaign-builder-form";

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

const actionLabels: Record<RecallAction, string> = {
  call_to_schedule: "Call to schedule",
  send_recall_message: "Prepare recall message",
  send_gentle_nudge: "Gentle follow-up",
  confirm_upcoming_visit: "Confirm appointment",
  wait: "Wait",
};

const campaignStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export default async function NewRecallCampaignPage() {
  let tenant: TenantContext;

  try {
    tenant = await requirePermission("campaign:prepare");
  } catch (error) {
    if (isAuthBoundaryError(error)) {
      return <PrivateRouteState error={error} />;
    }

    throw error;
  }

  const data = await getCampaignBuilderPageData(tenant);
  const snapshot = buildRecallWorkspaceSnapshot(data.candidates, data.asOf);
  const candidates = snapshot.queue.map(mapQueueItemToCampaignCandidate);

  return (
    <DashboardShell
      tenant={tenant}
      isDemoMode={isDevelopmentAuthEnabled() && isDemoTenantContext(tenant)}
    >
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge>{data.tenantName}</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">Create recall campaign</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Build a no-send campaign draft from tenant-scoped recall candidates. Receptionists and
              managers can review the audience and template before any future delivery adapter is
              introduced.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/recall"
              className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Back to recall
            </Link>
            <Link
              href="/dashboard/import"
              className="inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Import patients
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-4 p-6 md:grid-cols-4 lg:p-8">
        <Card>
          <p className="text-sm font-semibold text-ink">Data source</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{data.source}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Production never falls back to demo campaign data.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Recall candidates</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{snapshot.queue.length}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Candidates are loaded through tenant-scoped repositories.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Selected by default</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">
            {snapshot.queue.filter(isDefaultCampaignCandidate).length}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Default selection avoids scheduled and not-ready patients.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Existing drafts</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{data.draftCount}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Drafts remain internal until approval and delivery exist.
          </p>
        </Card>
      </section>

      {data.drafts.length > 0 ? (
        <section className="px-6 pb-6 lg:px-8">
          <div className="rounded-lg border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Recent campaigns</h2>
              <p className="mt-1 text-sm text-muted">
                Campaign records are tenant-owned and no-send.
              </p>
            </div>
            <div className="divide-y divide-line">
              {data.drafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/dashboard/recall/campaigns/${draft.id}`}
                  className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_120px_100px]"
                >
                  <div>
                    <p className="font-semibold text-ink">{draft.name}</p>
                    <p className="mt-1 text-muted">
                      Created {dateFormatter.format(draft.createdAt)}
                    </p>
                  </div>
                  <p className="font-semibold text-ink">{draft.audienceCount} patients</p>
                  <p className="text-muted">
                    {draft.channel} - {campaignStatusLabels[draft.status] ?? draft.status}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-6 pb-8 lg:px-8">
        <RecallCampaignBuilderForm
          tenantName={data.tenantName}
          source={data.source}
          candidates={candidates}
        />
      </section>
    </DashboardShell>
  );
}

type CampaignBuilderPageData = {
  asOf: Date;
  tenantName: string;
  source: "database" | "demo" | "unavailable";
  candidates: Parameters<typeof buildRecallWorkspaceSnapshot>[0];
  draftCount: number;
  drafts: Array<{
    id: string;
    name: string;
    status: string;
    channel: string;
    audienceCount: number;
    createdAt: Date;
  }>;
};

async function getCampaignBuilderPageData(tenant: TenantContext): Promise<CampaignBuilderPageData> {
  const asOf = new Date();

  try {
    const db = getPrismaClient();
    const [candidates, drafts] = await Promise.all([
      listRecallCandidatesForTenant(tenant.tenantId, asOf, {
        db: db as unknown as PatientRepositoryDatabase,
      }),
      listRecallCampaignsForTenant(tenant.tenantId, {
        db: db as unknown as RecallCampaignRepositoryDatabase,
        take: 5,
      }),
    ]);

    return {
      asOf,
      tenantName: tenant.tenantName ?? "Selected clinic",
      source: "database",
      candidates,
      draftCount: drafts.filter((draft) => draft.status === "DRAFT").length,
      drafts: drafts.map((draft) => ({
        id: draft.id,
        name: draft.name,
        status: draft.status,
        channel: draft.channel,
        audienceCount: draft.audienceCount,
        createdAt: draft.createdAt,
      })),
    };
  } catch (error) {
    if (!canUseDemoFallback(tenant)) {
      if (error instanceof DatabaseUnavailableError) {
        return {
          asOf,
          tenantName: tenant.tenantName ?? "Selected clinic",
          source: "unavailable",
          candidates: [],
          draftCount: 0,
          drafts: [],
        };
      }

      throw error;
    }

    return {
      asOf,
      tenantName: tenant.tenantName ?? "Selected clinic",
      source: "demo",
      candidates: listDemoRecallCandidatesForTenant(tenant.tenantId),
      draftCount: 0,
      drafts: [],
    };
  }
}

function canUseDemoFallback(tenant: TenantContext): boolean {
  return isDevelopmentAuthEnabled() && isDemoTenantContext(tenant);
}

function mapQueueItemToCampaignCandidate(patient: RecallQueueItem): CampaignBuilderCandidate {
  return {
    id: patient.id,
    displayName: patient.displayName,
    dueLabel: formatDueDate(patient),
    dueDistance: formatDueDistance(patient.daysUntilDue),
    statusLabel: statusLabels[patient.status],
    preferredChannel: patient.preferredChannel.toUpperCase(),
    recommendedActionLabel: actionLabels[patient.recommendedAction],
    riskNote: patient.riskNote,
    priorityScore: patient.priorityScore,
    defaultSelected: isDefaultCampaignCandidate(patient),
    eligible: isCampaignEligibleCandidate(patient),
  };
}

function formatDueDate(patient: RecallQueueItem): string {
  if (!patient.nextRecallDueAt) {
    return "No recall date";
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
