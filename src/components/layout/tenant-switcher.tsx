import { switchTenantAction } from "@/server/auth/tenant-actions";
import { listTenantOptionsForUser } from "@/server/auth/tenant-session";
import type { TenantContext } from "@/modules/tenants";

type TenantSwitcherProps = {
  tenant: TenantContext;
  isDemoMode?: boolean;
};

export async function TenantSwitcher({ tenant, isDemoMode = false }: TenantSwitcherProps) {
  let tenantOptions = [
    {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName ?? "Selected clinic",
      membershipId: tenant.membershipId,
      role: tenant.role,
    },
  ];

  try {
    tenantOptions = await listTenantOptionsForUser({
      id: tenant.userId,
      email: tenant.userEmail ?? "",
      isDemoMode,
    });
  } catch {
    // Tenant switching should not block the current tenant context from rendering.
  }

  if (tenantOptions.length <= 1) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <span className="rounded bg-surface px-2.5 py-1">
          {tenant.tenantName ?? "Selected clinic"}
        </span>
        <span className="rounded bg-surface px-2.5 py-1">{formatRole(tenant.role)}</span>
        {isDemoMode ? (
          <span className="rounded bg-brand-50 px-2.5 py-1 text-brand-700">
            Development demo mode
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <form action={switchTenantAction} className="flex flex-wrap items-center gap-2">
      <label htmlFor="active-tenant" className="sr-only">
        Active clinic tenant
      </label>
      <select
        id="active-tenant"
        name="tenantId"
        defaultValue={tenant.tenantId}
        className="min-h-9 rounded-md border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink"
      >
        {tenantOptions.map((option) => (
          <option key={option.membershipId} value={option.tenantId}>
            {option.tenantName} - {formatRole(option.role)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="min-h-9 rounded-md border border-line bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface"
      >
        Switch
      </button>
      {isDemoMode ? (
        <span className="rounded bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          Development demo mode
        </span>
      ) : null}
    </form>
  );
}

function formatRole(role: TenantContext["role"]): string {
  if (role === "CLINICIAN") {
    return "Doctor";
  }

  return role
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
