import { cookies } from "next/headers";
import { DEMO_TENANT_NAME } from "@/lib/constants";
import type { TenantContext } from "@/modules/tenants";
import {
  listTenantsForUser,
  requireTenantMembership,
  type TenantMembershipOption,
} from "@/modules/tenants/memberships";

const activeTenantCookieName = "klinika360_active_tenant";
const demoUserId = "user_demo_klinika360_owner";

type TenantSessionUser = {
  id: string;
  email: string;
  isDemoMode: boolean;
};

const demoTenantOptions: TenantMembershipOption[] = [
  {
    tenantId: "tenant_demo_klinika360",
    tenantName: DEMO_TENANT_NAME,
    membershipId: "membership_demo_klinika360_owner",
    role: "OWNER",
  },
  {
    tenantId: "tenant_demo_klinika360_specialists",
    tenantName: "Klinika360 Specialists",
    membershipId: "membership_demo_klinika360_specialists_manager",
    role: "MANAGER",
  },
];

export async function getActiveTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(activeTenantCookieName)?.value ?? null;
}

export async function setActiveTenantId(tenantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(activeTenantCookieName, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearActiveTenantId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(activeTenantCookieName);
}

export async function resolveActiveTenantForUser(
  user: TenantSessionUser,
): Promise<TenantContext | null> {
  const memberships = await listTenantOptionsForUser(user);

  if (memberships.length === 0) {
    return null;
  }

  const selectedTenantId = await getActiveTenantId();
  const selectedMembership = selectedTenantId
    ? memberships.find((membership) => membership.tenantId === selectedTenantId)
    : undefined;
  const activeMembership = selectedMembership ?? memberships[0];

  return {
    tenantId: activeMembership.tenantId,
    tenantName: activeMembership.tenantName,
    userId: user.id,
    userEmail: user.email,
    membershipId: activeMembership.membershipId,
    role: activeMembership.role,
  };
}

export async function switchActiveTenantForUser(input: {
  tenantId: string;
  userId: string;
  isDemoMode: boolean;
}): Promise<TenantMembershipOption> {
  if (input.isDemoMode && input.userId === demoUserId) {
    const demoMembership = demoTenantOptions.find(
      (membership) => membership.tenantId === input.tenantId,
    );

    if (!demoMembership) {
      throw new Error("Demo tenant membership was not found.");
    }

    await setActiveTenantId(demoMembership.tenantId);
    return demoMembership;
  }

  const membership = await requireTenantMembership(input.tenantId, input.userId);
  await setActiveTenantId(membership.tenantId);
  return membership;
}

export async function listTenantOptionsForUser(
  user: TenantSessionUser,
): Promise<TenantMembershipOption[]> {
  if (user.isDemoMode && user.id === demoUserId) {
    return demoTenantOptions;
  }

  return listTenantsForUser(user.id);
}
