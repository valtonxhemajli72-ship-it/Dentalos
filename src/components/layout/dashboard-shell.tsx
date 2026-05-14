import { SiteHeader } from "@/components/layout/site-header";
import type { TenantContext } from "@/modules/tenants";

type DashboardShellProps = {
  children: React.ReactNode;
  tenant?: TenantContext;
  isDemoMode?: boolean;
};

export function DashboardShell({ children, tenant, isDemoMode }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-surface">
      <SiteHeader tenant={tenant} isDemoMode={isDemoMode} />
      {children}
    </main>
  );
}
