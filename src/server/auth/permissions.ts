import type { TenantRole } from "@/modules/tenants";

export type Permission =
  | "patient:read"
  | "patient:create"
  | "patient:update"
  | "patient:import"
  | "recall:read"
  | "recall:create"
  | "recall:update"
  | "campaign:prepare"
  | "campaign:approve"
  | "notification:read"
  | "settings:read"
  | "settings:update"
  | "audit:read"
  | "tenant:read"
  | "tenant:switch"
  | "user:read"
  | "user:manage"
  | "invitation:create"
  | "invitation:revoke"
  | "membership:update"
  | "membership:deactivate"
  | "billing:read";

export class PermissionDeniedError extends Error {
  public readonly role: TenantRole;
  public readonly permission: Permission;

  constructor(role: TenantRole, permission: Permission) {
    super(`Role ${role} does not have permission ${permission}.`);
    this.name = "PermissionDeniedError";
    this.role = role;
    this.permission = permission;
  }
}

const allPermissions = [
  "patient:read",
  "patient:create",
  "patient:update",
  "patient:import",
  "recall:read",
  "recall:create",
  "recall:update",
  "campaign:prepare",
  "campaign:approve",
  "notification:read",
  "settings:read",
  "settings:update",
  "audit:read",
  "tenant:read",
  "tenant:switch",
  "user:read",
  "user:manage",
  "invitation:create",
  "invitation:revoke",
  "membership:update",
  "membership:deactivate",
  "billing:read",
] as const satisfies readonly Permission[];

const rolePermissions: Record<TenantRole, readonly Permission[]> = {
  OWNER: allPermissions,
  ADMIN: [
    "patient:read",
    "patient:create",
    "patient:update",
    "patient:import",
    "recall:read",
    "recall:create",
    "recall:update",
    "campaign:prepare",
    "campaign:approve",
    "notification:read",
    "settings:read",
    "settings:update",
    "audit:read",
    "tenant:read",
    "tenant:switch",
    "user:read",
    "user:manage",
    "invitation:create",
    "invitation:revoke",
    "membership:update",
    "membership:deactivate",
    "billing:read",
  ],
  DOCTOR: ["patient:read", "patient:update", "recall:read", "tenant:switch"],
  RECEPTIONIST: [
    "patient:read",
    "patient:create",
    "patient:import",
    "recall:read",
    "recall:create",
    "campaign:prepare",
    "notification:read",
    "tenant:switch",
  ],
  MANAGER: [
    "patient:read",
    "recall:read",
    "recall:create",
    "recall:update",
    "campaign:prepare",
    "campaign:approve",
    "notification:read",
    "tenant:read",
    "tenant:switch",
    "user:read",
    "settings:read",
    "audit:read",
    "billing:read",
  ],
  CLINICIAN: ["patient:read", "patient:update", "recall:read", "tenant:switch"],
  STAFF: ["patient:read", "recall:read", "notification:read", "tenant:switch"],
};

export function getPermissionsForRole(role: TenantRole): readonly Permission[] {
  return rolePermissions[role] ?? [];
}

export function roleHasPermission(role: TenantRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function assertPermission(role: TenantRole, permission: Permission): void {
  if (!roleHasPermission(role, permission)) {
    throw new PermissionDeniedError(role, permission);
  }
}
