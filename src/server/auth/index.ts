import type { TenantContext } from "@/modules/tenants";

export type AuthSession = {
  userId: string;
  email: string;
  activeTenant?: TenantContext;
};

export async function requireSession(): Promise<AuthSession> {
  throw new Error("Authentication is not implemented yet.");
}
