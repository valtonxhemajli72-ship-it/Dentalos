"use server";

import { revalidatePath } from "next/cache";
import { setActiveTenantId } from "@/server/auth/tenant-session";
import {
  acceptTenantInvitation,
  type InvitationAcceptanceResult,
  type InvitationAcceptanceStatus,
} from "@/modules/tenants/invitations";
import {
  createInvitationAcceptAttemptedAuditEvent,
  createInvitationAcceptedAuditEvent,
  createInvitationAcceptEmailMismatchAuditEvent,
  createInvitationAcceptExpiredAuditEvent,
  createInvitationAcceptFailedAuditEvent,
  createInvitationAcceptRevokedAuditEvent,
  createMembershipCreatedFromInvitationAuditEvent,
  writeAuditEvent,
  type AuditEvent,
  type AuditLogDatabase,
} from "@/server/audit";
import { AuthenticationRequiredError, requireCurrentUser } from "@/server/auth";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";

export type AcceptInvitationActionState = {
  status: InvitationAcceptanceStatus | "idle" | "unauthenticated" | "unavailable";
  message: string;
  dashboardHref?: string;
};

export async function acceptInvitationAction(
  _previousState: AcceptInvitationActionState,
  formData: FormData,
): Promise<AcceptInvitationActionState> {
  try {
    const user = await requireCurrentUser();
    const rawInvitationToken = String(formData.get("token") ?? "");

    if (!rawInvitationToken.trim()) {
      return {
        status: "invalid",
        message: "This invitation link is invalid or no longer available.",
      };
    }

    const result = await acceptTenantInvitation({
      rawInvitationToken,
      authenticatedUser: {
        id: user.id,
        email: user.email,
        name: user.name,
        isProvisioned: user.isProvisioned,
      },
    });

    await writeInvitationAcceptanceAuditEvents(result, user.isProvisioned ? user.id : undefined);

    if (isAcceptedResult(result) && result.tenantId) {
      await setActiveTenantId(result.tenantId);
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/settings/team");
    }

    return mapAcceptanceResultToState(result);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return {
        status: "unauthenticated",
        message: "Sign in before accepting this invitation.",
      };
    }

    if (error instanceof DatabaseUnavailableError) {
      return {
        status: "unavailable",
        message: "Invitation acceptance needs database access. Try again when it is available.",
      };
    }

    throw error;
  }
}

async function writeInvitationAcceptanceAuditEvents(
  result: InvitationAcceptanceResult,
  fallbackActorUserId: string | undefined,
): Promise<void> {
  if (!result.tenantId || !result.invitationId) {
    return;
  }

  const actorUserId = result.actorUserId ?? fallbackActorUserId;
  const role = result.role ?? "unknown";
  const events: AuditEvent[] = [
    createInvitationAcceptAttemptedAuditEvent({
      tenantId: result.tenantId,
      actorUserId,
      invitationId: result.invitationId,
      metadata: {
        status: result.status,
        role,
      },
    }),
  ];

  if (result.status === "accepted" || result.status === "already_member") {
    events.push(
      createInvitationAcceptedAuditEvent({
        tenantId: result.tenantId,
        actorUserId,
        invitationId: result.invitationId,
        metadata: {
          role,
          status: result.status,
          membershipCreated: Boolean(result.membershipCreated),
          membershipReactivated: Boolean(result.membershipReactivated),
        },
      }),
    );

    if ((result.membershipCreated || result.membershipReactivated) && result.membershipId) {
      events.push(
        createMembershipCreatedFromInvitationAuditEvent({
          tenantId: result.tenantId,
          actorUserId,
          membershipId: result.membershipId,
          invitationId: result.invitationId,
          metadata: {
            role,
            reactivated: Boolean(result.membershipReactivated),
          },
        }),
      );
    }
  } else if (result.status === "expired") {
    events.push(
      createInvitationAcceptExpiredAuditEvent({
        tenantId: result.tenantId,
        actorUserId,
        invitationId: result.invitationId,
        metadata: { status: result.status },
      }),
    );
  } else if (result.status === "revoked") {
    events.push(
      createInvitationAcceptRevokedAuditEvent({
        tenantId: result.tenantId,
        actorUserId,
        invitationId: result.invitationId,
        metadata: { status: result.status },
      }),
    );
  } else if (result.status === "email_mismatch") {
    events.push(
      createInvitationAcceptEmailMismatchAuditEvent({
        tenantId: result.tenantId,
        actorUserId,
        invitationId: result.invitationId,
        metadata: { status: result.status },
      }),
    );
  } else {
    events.push(
      createInvitationAcceptFailedAuditEvent({
        tenantId: result.tenantId,
        actorUserId,
        invitationId: result.invitationId,
        metadata: {
          reason: result.status,
          status: result.status,
          role,
        },
      }),
    );
  }

  await tryWriteAuditEvents(events);
}

async function tryWriteAuditEvents(events: AuditEvent[]): Promise<void> {
  try {
    const db = getPrismaClient() as unknown as AuditLogDatabase;

    for (const event of events) {
      await writeAuditEvent(db, event);
    }
  } catch {
    // Invitation acceptance remains safe if local audit persistence is unavailable.
  }
}

function mapAcceptanceResultToState(
  result: InvitationAcceptanceResult,
): AcceptInvitationActionState {
  switch (result.status) {
    case "accepted":
      return {
        status: result.status,
        message: "Invitation accepted. Your clinic access is ready.",
        dashboardHref: "/dashboard",
      };
    case "already_member":
      return {
        status: result.status,
        message: "You already have access to this clinic. The invitation has been closed.",
        dashboardHref: "/dashboard",
      };
    case "expired":
      return {
        status: result.status,
        message: "This invitation has expired. Ask a clinic admin to send a new invitation.",
      };
    case "revoked":
      return {
        status: result.status,
        message: "This invitation has been revoked.",
      };
    case "already_accepted":
      return {
        status: result.status,
        message: "This invitation has already been accepted.",
        dashboardHref: "/dashboard",
      };
    case "email_mismatch":
      return {
        status: result.status,
        message: "This invitation was issued for a different email address.",
      };
    case "owner_role_blocked":
      return {
        status: result.status,
        message: "Owner invitations require a separate reviewed owner transfer workflow.",
      };
    case "invalid":
    default:
      return {
        status: "invalid",
        message: "This invitation link is invalid or no longer available.",
      };
  }
}

function isAcceptedResult(result: InvitationAcceptanceResult): boolean {
  return result.status === "accepted" || result.status === "already_member";
}
