"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/server/auth";
import { switchActiveTenantForUser } from "@/server/auth/tenant-session";
import {
  createTenantSwitchedAuditEvent,
  writeAuditEvent,
  type AuditLogDatabase,
} from "@/server/audit";
import { getPrismaClient } from "@/server/db";
import type { TenantContext } from "@/modules/tenants";

export async function switchTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) {
    throw new Error("Tenant selection is required.");
  }

  const user = await requireCurrentUser();
  const membership = await switchActiveTenantForUser({
    tenantId,
    userId: user.id,
    isDemoMode: user.source === "demo",
  });
  await tryWriteTenantSwitchAuditEvent({
    tenantId: membership.tenantId,
    tenantName: membership.tenantName,
    userId: user.id,
    userEmail: user.email,
    membershipId: membership.membershipId,
    role: membership.role,
  });

  revalidatePath("/dashboard");
}

async function tryWriteTenantSwitchAuditEvent(tenant: TenantContext): Promise<void> {
  try {
    await writeAuditEvent(
      getPrismaClient() as unknown as AuditLogDatabase,
      createTenantSwitchedAuditEvent(tenant, { fromTenantSelected: true }),
    );
  } catch {
    // Tenant switching should not fail because audit persistence is unavailable locally.
  }
}
