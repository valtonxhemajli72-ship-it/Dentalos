import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PrivateRouteState } from "@/components/layout/private-route-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TenantRole } from "@/modules/tenants";
import {
  listTenantInvitations,
  type TenantInvitationListItem,
} from "@/modules/tenants/invitations";
import {
  listMembershipsForTenant,
  type TenantMembershipListItem,
} from "@/modules/tenants/memberships";
import {
  isAuthBoundaryError,
  isDemoTenantContext,
  isDevelopmentAuthEnabled,
  requirePermission,
} from "@/server/auth";
import { roleHasPermission } from "@/server/auth/permissions";
import { DatabaseUnavailableError } from "@/server/db";
import {
  inviteStaffAction,
  revokeInvitationAction,
  updateMemberRoleAction,
} from "@/app/dashboard/settings/team/actions";

export const dynamic = "force-dynamic";

const assignableRoles: TenantRole[] = ["ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER", "STAFF"];

type TeamPageData = {
  members: TenantMembershipListItem[];
  invitations: TenantInvitationListItem[];
  source: "database" | "unavailable";
};

export default async function TeamSettingsPage() {
  let tenant;

  try {
    tenant = await requirePermission("user:read");
  } catch (error) {
    if (isAuthBoundaryError(error)) {
      return <PrivateRouteState error={error} />;
    }

    throw error;
  }

  const data = await getTeamPageData(tenant);
  const canInvite = roleHasPermission(tenant.role, "invitation:create");
  const canRevoke = roleHasPermission(tenant.role, "invitation:revoke");
  const canUpdateMembers = roleHasPermission(tenant.role, "membership:update");

  return (
    <DashboardShell
      tenant={tenant}
      isDemoMode={isDevelopmentAuthEnabled() && isDemoTenantContext(tenant)}
    >
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge>{tenant.tenantName ?? "Selected clinic"}</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">Team access</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Manage who can access this tenant and prepare staff invitations. Role changes and
              invitations stay tenant-scoped, and no invitation email is sent from this MVP flow.
            </p>
          </div>
          <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
            Current role: {formatRole(tenant.role)}
          </div>
        </div>
      </div>

      <section className="grid gap-4 p-6 md:grid-cols-3 lg:p-8">
        <Card>
          <p className="text-sm font-semibold text-ink">Data source</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{data.source}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Database access is required for persisted team management.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Active members</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">{data.members.length}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Every member row is scoped to the current tenant.
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink">Pending invitations</p>
          <p className="mt-3 text-2xl font-semibold text-brand-700">
            {data.invitations.filter((invitation) => invitation.status === "PENDING").length}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Invitation records store token hashes only, not raw tokens.
          </p>
        </Card>
      </section>

      <section className="grid gap-6 px-6 pb-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Members</h2>
              <p className="mt-1 text-sm text-muted">
                Emails are masked in this operational view. Owners are protected from accidental
                lockout.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line text-left text-sm">
                <thead className="bg-surface text-xs font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-5 py-3">Team member</th>
                    <th className="px-5 py-3">Contact</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Role management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.members.map((member) => (
                    <tr key={member.membershipId}>
                      <td className="px-5 py-4 font-semibold text-ink">{member.userDisplayName}</td>
                      <td className="px-5 py-4 text-muted">{member.userEmailMasked}</td>
                      <td className="px-5 py-4 text-muted">{formatRole(member.role)}</td>
                      <td className="px-5 py-4">
                        {canUpdateMembers && member.role !== "OWNER" ? (
                          <form action={updateMemberRoleAction} className="flex flex-wrap gap-2">
                            <input type="hidden" name="membershipId" value={member.membershipId} />
                            <label htmlFor={`role-${member.membershipId}`} className="sr-only">
                              New role for {member.userDisplayName}
                            </label>
                            <select
                              id={`role-${member.membershipId}`}
                              name="role"
                              defaultValue={member.role}
                              className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
                            >
                              {assignableRoles.map((role) => (
                                <option key={role} value={role}>
                                  {formatRole(role)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                            >
                              Update
                            </button>
                          </form>
                        ) : (
                          <span className="text-sm text-muted">
                            {member.role === "OWNER" ? "Owner protected" : "Read-only"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data.members.length === 0 ? (
                    <tr>
                      <td className="px-5 py-6 text-sm text-muted" colSpan={4}>
                        No team members could be loaded for this tenant.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Pending invitations</h2>
              <p className="mt-1 text-sm text-muted">
                Email delivery is not implemented yet. Acceptance links are prepared for future
                delivery, and this UI does not expose raw invitation tokens.
              </p>
            </div>
            <div className="divide-y divide-line">
              {data.invitations.map((invitation) => (
                <div
                  key={invitation.invitationId}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-ink">{invitation.emailMasked}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatRole(invitation.role)} - {invitation.status.toLowerCase()} - expires{" "}
                      {formatDate(invitation.expiresAt)}
                    </p>
                  </div>
                  {canRevoke && invitation.status === "PENDING" ? (
                    <form action={revokeInvitationAction}>
                      <input type="hidden" name="invitationId" value={invitation.invitationId} />
                      <button
                        type="submit"
                        className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
                      >
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
              {data.invitations.length === 0 ? (
                <div className="px-5 py-6 text-sm text-muted">
                  No invitations found for this tenant.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside>
          <Card>
            <h2 className="text-base font-semibold text-ink">Invite staff</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Create a tenant-scoped invitation record. Email delivery is intentionally deferred.
            </p>
            <form action={inviteStaffAction} className="mt-5 space-y-4">
              <div>
                <label htmlFor="invite-email" className="text-sm font-semibold text-ink">
                  Work email
                </label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  disabled={!canInvite}
                  className="mt-2 min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:bg-surface"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="text-sm font-semibold text-ink">
                  Role
                </label>
                <select
                  id="invite-role"
                  name="role"
                  defaultValue="STAFF"
                  disabled={!canInvite}
                  className="mt-2 min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:bg-surface"
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!canInvite}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create invitation
              </button>
            </form>
            {!canInvite ? (
              <p className="mt-4 text-sm leading-6 text-muted">
                Your role can review team access but cannot create invitations.
              </p>
            ) : null}
          </Card>
        </aside>
      </section>
    </DashboardShell>
  );
}

async function getTeamPageData(
  tenant: Awaited<ReturnType<typeof requirePermission>>,
): Promise<TeamPageData> {
  try {
    const [members, invitations] = await Promise.all([
      listMembershipsForTenant(tenant.tenantId, tenant),
      listTenantInvitations(tenant.tenantId, tenant),
    ]);

    return {
      members,
      invitations,
      source: "database",
    };
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return {
        members: [
          {
            membershipId: tenant.membershipId,
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName ?? "Selected clinic",
            userId: tenant.userId,
            userDisplayName: "Current user",
            userEmailMasked: tenant.userEmail ? "Email on file" : "Email unavailable",
            role: tenant.role,
          },
        ],
        invitations: [],
        source: "unavailable",
      };
    }

    throw error;
  }
}

function formatRole(role: TenantRole): string {
  if (role === "CLINICIAN") {
    return "Doctor";
  }

  return role
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
