"use server";

import { revalidatePath } from "next/cache";
import { isDemoTenantContext, isDevelopmentAuthEnabled, requirePermission } from "@/server/auth";
import { switchActiveTenantForUser } from "@/server/auth/tenant-session";
import {
  createTenantSwitchedAuditEvent,
  writeAuditEvent,
  type AuditLogDatabase,
} from "@/server/audit";
import { getPrismaClient } from "@/server/db";
import type { TenantContext } from "@/modules/tenants";

export async function switchTenantAction(formData: FormData): Promise<void> {
  const currentTenant = await requirePermission("tenant:switch");
  const tenantId = String(formData.get("tenantId") ?? "").trim();

  if (!tenantId) {
    throw new Error("Tenant selection is required.");
  }

  const membership = await switchActiveTenantForUser({
    tenantId,
    userId: currentTenant.userId,
    isDemoMode: isDevelopmentAuthEnabled() && isDemoTenantContext(currentTenant),
  });
  await tryWriteTenantSwitchAuditEvent({
    tenantId: membership.tenantId,
    tenantName: membership.tenantName,
    userId: currentTenant.userId,
    userEmail: currentTenant.userEmail,
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
