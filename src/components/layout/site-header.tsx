import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { APP_NAME } from "@/lib/constants";
import type { TenantContext } from "@/modules/tenants";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/patients", label: "Patients" },
  { href: "/dashboard/import", label: "Import" },
  { href: "/dashboard/recall", label: "Recall" },
  { href: "/dashboard/onboarding", label: "Onboarding" },
];

type SiteHeaderProps = {
  tenant?: TenantContext;
  isDemoMode?: boolean;
};

export function SiteHeader({ tenant, isDemoMode = false }: SiteHeaderProps) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-col items-start justify-between gap-3 px-6 py-3 sm:flex-row sm:items-center lg:px-8">
        <Link href="/" className="text-base font-semibold text-ink">
          {APP_NAME}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {tenant ? (
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
          ) : null}
          <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {tenant && !isDemoMode ? <SignOutButton /> : null}
          {!tenant ? (
            <Link
              href="/sign-in"
              className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
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
