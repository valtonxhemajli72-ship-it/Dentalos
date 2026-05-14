import { DEMO_TENANT_NAME } from "@/lib/constants";
import type { TenantContext } from "@/modules/tenants";
import {
  assertPermission,
  PermissionDeniedError,
  type Permission,
} from "@/server/auth/permissions";
import { authOptions, isRealAuthProviderConfigured } from "@/server/auth/config";
import { DatabaseUnavailableError, getPrismaClient } from "@/server/db";
import { getServerSession } from "next-auth";

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
  isProvisioned: boolean;
  source: "provider" | "demo";
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
  isProvisioned: true,
  source: "demo",
};

export function isDemoTenantContext(tenant: TenantContext): boolean {
  return (
    tenant.tenantId === demoTenantContext.tenantId && tenant.userId === demoTenantContext.userId
  );
}

export function isDevelopmentAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_AUTH_ENABLED === "true";
}

export function isProductionAuthConfigured(): boolean {
  return isRealAuthProviderConfigured();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const providerSession = await getProviderSession();
  const providerEmail = providerSession?.user?.email;

  if (providerEmail) {
    const provisionedUser = await findProvisionedUserByEmail(providerEmail);

    if (provisionedUser) {
      return provisionedUser;
    }

    return {
      id: "unprovisioned_provider_user",
      email: providerEmail,
      name: providerSession.user?.name ?? undefined,
      isProvisioned: false,
      source: "provider",
    };
  }

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

  if (user.source === "demo" && isDevelopmentAuthEnabled()) {
    return demoTenantContext;
  }

  if (!user.isProvisioned) {
    return null;
  }

  return findTenantContextForUser(user);
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

type ProvisionedUserRecord = {
  id: string;
  email: string;
  name?: string | null;
};

type MembershipRecord = {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantContext["role"];
  tenant: {
    id: string;
    name: string;
  };
};

type AuthDatabase = {
  user: {
    findUnique(args: Record<string, unknown>): Promise<ProvisionedUserRecord | null>;
  };
  membership: {
    findFirst(args: Record<string, unknown>): Promise<MembershipRecord | null>;
  };
};

async function getProviderSession() {
  if (!isRealAuthProviderConfigured() && process.env.NODE_ENV === "production") {
    return null;
  }

  try {
    return getServerSession(authOptions);
  } catch {
    return null;
  }
}

async function findProvisionedUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const db = getPrismaClient() as unknown as AuthDatabase;
    const user = await db.user.findUnique({
      where: { email },
    });

    return user
      ? {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          isProvisioned: true,
          source: "provider",
        }
      : null;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return null;
    }

    throw error;
  }
}

async function findTenantContextForUser(user: AuthUser): Promise<TenantContext | null> {
  try {
    const db = getPrismaClient() as unknown as AuthDatabase;
    const membership = await db.membership.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });

    return membership
      ? {
          tenantId: membership.tenantId,
          tenantName: membership.tenant.name,
          userId: membership.userId,
          userEmail: user.email,
          membershipId: membership.id,
          role: membership.role,
        }
      : null;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return null;
    }

    throw error;
  }
}
