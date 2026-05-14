import { DEMO_TENANT_NAME } from "@/lib/constants";
import type { TenantContext } from "@/modules/tenants";
import {
  assertPermission,
  PermissionDeniedError,
  type Permission,
} from "@/server/auth/permissions";

export class AuthenticationRequiredError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export class TenantContextRequiredError extends Error {
  constructor(message = "Tenant context is required.") {
    super(message);
    this.name = "TenantContextRequiredError";
  }
}

export class RoleDeniedError extends Error {
  public readonly role: TenantContext["role"];
  public readonly allowedRoles: TenantContext["role"][];

  constructor(role: TenantContext["role"], allowedRoles: TenantContext["role"][]) {
    super(`Role ${role} is not allowed for this workflow.`);
    this.name = "RoleDeniedError";
    this.role = role;
    this.allowedRoles = allowedRoles;
  }
}

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type AuthSession = {
  userId: string;
  email: string;
  user: AuthUser;
  activeTenant?: TenantContext;
  isDemoMode: boolean;
};

export const demoTenantContext: TenantContext = {
  tenantId: "tenant_demo_klinika360",
  tenantName: DEMO_TENANT_NAME,
  userId: "user_demo_klinika360_owner",
  userEmail: "demo-user@example.test",
  membershipId: "membership_demo_klinika360_owner",
  role: "OWNER",
};

export const demoAuthUser: AuthUser = {
  id: demoTenantContext.userId,
  email: demoTenantContext.userEmail ?? "demo-user@example.test",
  name: "Klinika360 Demo User",
};

export function isDevelopmentAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isProductionAuthConfigured(): boolean {
  return false;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isDevelopmentAuthEnabled()) {
    return demoAuthUser;
  }

  return null;
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationRequiredError(
      isProductionAuthConfigured()
        ? "Authentication is required."
        : "Production authentication provider is not configured.",
    );
  }

  return user;
}

export async function getCurrentTenantContext(): Promise<TenantContext | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (isDevelopmentAuthEnabled()) {
    return demoTenantContext;
  }

  return null;
}

export async function requireTenantContext(): Promise<TenantContext> {
  await requireCurrentUser();
  const tenant = await getCurrentTenantContext();

  if (!tenant) {
    throw new TenantContextRequiredError("Authenticated users must have an active tenant.");
  }

  return tenant;
}

export async function requireMembership(): Promise<{
  membershipId: string;
  tenantId: string;
  userId: string;
  role: TenantContext["role"];
}> {
  const tenant = await requireTenantContext();

  return {
    membershipId: tenant.membershipId,
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    role: tenant.role,
  };
}

export async function requireRole(
  allowedRoles: TenantContext["role"] | TenantContext["role"][],
): Promise<TenantContext> {
  const tenant = await requireTenantContext();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(tenant.role)) {
    throw new RoleDeniedError(tenant.role, roles);
  }

  return tenant;
}

export async function requirePermission(permission: Permission): Promise<TenantContext> {
  const tenant = await requireTenantContext();
  assertPermission(tenant.role, permission);
  return tenant;
}

export async function requireSession(): Promise<AuthSession> {
  const user = await requireCurrentUser();
  const activeTenant = await requireTenantContext();

  return {
    userId: user.id,
    email: user.email,
    user,
    activeTenant,
    isDemoMode: isDevelopmentAuthEnabled(),
  };
}

export function isAuthBoundaryError(error: unknown): boolean {
  return (
    error instanceof AuthenticationRequiredError ||
    error instanceof TenantContextRequiredError ||
    error instanceof RoleDeniedError ||
    error instanceof PermissionDeniedError
  );
}

export function describeAuthBoundaryError(error: unknown): string {
  if (error instanceof RoleDeniedError) {
    return "Your role is not allowed to access this private workflow.";
  }

  if (error instanceof PermissionDeniedError) {
    return "Your role does not have permission to access this workflow.";
  }

  if (error instanceof TenantContextRequiredError) {
    return "No active clinic tenant is available for this session.";
  }

  if (error instanceof AuthenticationRequiredError) {
    return "Authentication is required before accessing private clinic workflows.";
  }

  return "Access is not available.";
}
