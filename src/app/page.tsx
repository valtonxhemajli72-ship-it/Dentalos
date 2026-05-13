import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { wedgeCapabilities } from "@/lib/constants";

const workflowRows = [
  { label: "Due for recall", count: "42", tone: "bg-brand-50 text-brand-700" },
  { label: "Unconfirmed appointments", count: "18", tone: "bg-amber-50 text-amber-800" },
  { label: "Dormant patients", count: "76", tone: "bg-blue-50 text-blue-800" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_460px] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <Badge>Recall, reminders, and follow-up</Badge>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              DentalOS
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              A multi-tenant clinic operating system starting with the workflows that keep patients
              returning: recall campaigns, appointment reminders, post-visit follow-up, and patient
              reactivation.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                View dashboard
              </Link>
              <a
                href="#foundation"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface"
              >
                See foundation
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 shadow-soft">
            <div className="rounded-md border border-line bg-white">
              <div className="border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">Today at Riverside Dental</p>
                <p className="text-xs text-muted">Operational follow-up queue</p>
              </div>
              <div className="divide-y divide-line">
                {workflowRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <span className="text-sm text-muted">{row.label}</span>
                    <span className={`rounded px-2.5 py-1 text-sm font-semibold ${row.tone}`}>
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-t border-line text-center">
                <div className="px-3 py-4">
                  <p className="text-lg font-semibold text-ink">12</p>
                  <p className="text-xs text-muted">queued</p>
                </div>
                <div className="border-x border-line px-3 py-4">
                  <p className="text-lg font-semibold text-ink">31</p>
                  <p className="text-xs text-muted">sent</p>
                </div>
                <div className="px-3 py-4">
                  <p className="text-lg font-semibold text-ink">7</p>
                  <p className="text-xs text-muted">needs review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="foundation" className="bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-ink">Built for a serious SaaS foundation</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              The first slice stays focused on recall and reminders while the codebase is prepared
              for tenants, patients, appointments, notifications, billing, reports, integrations,
              and AI-assisted workflows.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {wedgeCapabilities.map((capability) => (
              <Card key={capability.title}>
                <p className="text-sm font-semibold text-ink">{capability.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{capability.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
