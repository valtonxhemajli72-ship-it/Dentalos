import { SiteHeader } from "@/components/layout/site-header";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-surface">
      <SiteHeader />
      {children}
    </main>
  );
}
