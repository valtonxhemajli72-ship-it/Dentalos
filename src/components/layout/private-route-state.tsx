import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { describeAuthBoundaryError } from "@/server/auth";

type PrivateRouteStateProps = {
  error: unknown;
};

export function PrivateRouteState({ error }: PrivateRouteStateProps) {
  return (
    <DashboardShell>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center px-6 py-12">
        <Badge>Private workflow</Badge>
        <h1 className="mt-4 text-3xl font-semibold text-ink">Access requires authorization</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{describeAuthBoundaryError(error)}</p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Demo access is available only in local development. Production dashboard routes fail
          closed until a real authentication provider and tenant membership resolution are
          configured.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-10 w-fit items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
        >
          Back to product overview
        </Link>
      </section>
    </DashboardShell>
  );
}
