import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function PatientsPage() {
  return (
    <DashboardShell>
      <div className="border-b border-line bg-white px-6 py-6 lg:px-8">
        <Badge>Patient workspace</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Patients</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          The patient workspace will become the tenant-scoped source for patient records. For this
          MVP slice, the most useful pilot action is importing patients and reviewing recall
          readiness.
        </p>
      </div>

      <section className="grid gap-4 p-6 md:grid-cols-3 lg:p-8">
        <Card>
          <h2 className="text-base font-semibold text-ink">Import patient list</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Paste a CSV, validate names, dates, contact indicators, and prepare tenant-owned drafts.
          </p>
          <Link
            href="/dashboard/import"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Start import
          </Link>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-ink">Review recall</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            See who is overdue, who is already scheduled, and which follow-up actions are ready.
          </p>
          <Link
            href="/dashboard/recall"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
          >
            Open recall queue
          </Link>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-ink">Pilot onboarding</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Walk a clinic through profile setup, patient import, recall review, and campaign
            preparation.
          </p>
          <Link
            href="/dashboard/onboarding"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
          >
            View onboarding
          </Link>
        </Card>
      </section>
    </DashboardShell>
  );
}
