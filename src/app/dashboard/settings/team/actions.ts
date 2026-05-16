"use server";

import { revalidatePath } from "next/cache";
import type { TenantRole } from "@/modules/tenants";
import { createTenantInvitation, revokeTenantInvitation } from "@/modules/tenants/invitations";
import { deactivateMembership, updateMembershipRole } from "@/modules/tenants/memberships";
import {
  createInvitationCreatedAuditEvent,
  createInvitationRevokedAuditEvent,
  createMembershipDeactivatedAuditEvent,
  createMembershipRoleUpdatedAuditEvent,
  writeAuditEvent,
  type AuditEvent,
  type AuditLogDatabase,
} from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { getPrismaClient } from "@/server/db";

const assignableRoles: TenantRole[] = ["ADMIN", "DOCTOR", "RECEPTIONIST", "MANAGER", "STAFF"];

export async function inviteStaffAction(formData: FormData): Promise<void> {
  const tenant = await requirePermission("invitation:create");
  const email = String(formData.get("email") ?? "");
  const role = parseAssignableRole(formData.get("role"));

  const invitation = await createTenantInvitation(
    {
      tenantId: tenant.tenantId,
      email,
      role,
    },
    tenant,
  );
  await tryWriteTeamAuditEvent(
    createInvitationCreatedAuditEvent(tenant, invitation.invitationId, {
      role: invitation.role,
      status: invitation.status,
    }),
  );

  revalidatePath("/dashboard/settings/team");
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const tenant = await requirePermission("invitation:revoke");
  const invitationId = String(formData.get("invitationId") ?? "");

  if (!invitationId) {
    throw new Error("Invitation is required.");
  }

  const invitation = await revokeTenantInvitation(tenant.tenantId, invitationId, tenant);
  await tryWriteTeamAuditEvent(
    createInvitationRevokedAuditEvent(tenant, invitation.invitationId, {
      status: invitation.status,
    }),
  );
  revalidatePath("/dashboard/settings/team");
}

export async function updateMemberRoleAction(formData: FormData): Promise<void> {
  const tenant = await requirePermission("membership:update");
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = parseAssignableRole(formData.get("role"));

  if (!membershipId) {
    throw new Error("Membership is required.");
  }

  const member = await updateMembershipRole(tenant.tenantId, membershipId, role, tenant);
  await tryWriteTeamAuditEvent(
    createMembershipRoleUpdatedAuditEvent(tenant, member.membershipId, {
      previousRole: member.previousRole ?? "unknown",
      nextRole: member.role,
    }),
  );
  revalidatePath("/dashboard/settings/team");
}

export async function deactivateMembershipAction(formData: FormData): Promise<void> {
  const tenant = await requirePermission("membership:deactivate");
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!membershipId) {
    throw new Error("Membership is required.");
  }

  const member = await deactivateMembership(tenant.tenantId, membershipId, tenant);
  await tryWriteTeamAuditEvent(
    createMembershipDeactivatedAuditEvent(tenant, member.membershipId, {
      previousRole: member.role,
    }),
  );
  revalidatePath("/dashboard/settings/team");
}

function parseAssignableRole(value: FormDataEntryValue | null): TenantRole {
  const role = String(value ?? "STAFF").toUpperCase() as TenantRole;

  if (!assignableRoles.includes(role)) {
    throw new Error("Selected role is not available for invitations.");
  }

  return role;
}

async function tryWriteTeamAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await writeAuditEvent(getPrismaClient() as unknown as AuditLogDatabase, event);
  } catch {
    // Team actions remain safe if local audit persistence is unavailable.
  }
}
