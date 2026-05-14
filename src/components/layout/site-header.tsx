import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { APP_NAME } from "@/lib/constants";
import type { TenantContext } from "@/modules/tenants";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/patients", label: "Patients" },
  { href: "/dashboard/import", label: "Import" },
  { href: "/dashboard/recall", label: "Recall" },
  { href: "/dashboard/settings/team", label: "Team" },
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
          {tenant ? <TenantSwitcher tenant={tenant} isDemoMode={isDemoMode} /> : null}
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
