import { DEMO_TENANT_NAME } from "@/lib/constants";
import type { TenantContext } from "@/modules/tenants";

export type AuthSession = {
  userId: string;
  email: string;
  activeTenant?: TenantContext;
};

export const demoTenantContext: TenantContext = {
  tenantId: "tenant_demo_klinika360",
  tenantName: DEMO_TENANT_NAME,
  userId: "user_demo_klinika360_owner",
  role: "OWNER",
};

export function isDevelopmentAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function requireSession(): Promise<AuthSession> {
  if (!isDevelopmentAuthEnabled()) {
    throw new Error("Authentication is not configured.");
  }

  return {
    userId: demoTenantContext.userId,
    email: "demo-user@example.test",
    activeTenant: demoTenantContext,
  };
}
