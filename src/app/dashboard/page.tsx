import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const focusCards = [
  {
    title: "No-show reduction",
    value: "18",
    label: "unconfirmed appointments",
    detail: "Prioritize patients who need confirmation before tomorrow's schedule is locked.",
  },
  {
    title: "Recall campaigns",
    value: "42",
    label: "patients due",
    detail: "Segment patients by due date, contact preference, and last successful outreach.",
    href: "/dashboard/recall",
  },
  {
    title: "Appointment reminders",
    value: "31",
    label: "messages prepared",
    detail: "Keep reminder creation separate from delivery providers and approval rules.",
  },
  {
    title: "Patient reactivation",
    value: "76",
    label: "inactive patients",
    detail: "Build a practical queue for dormant patient follow-up without over-automating.",
  },
  {
    title: "Patient import",
    value: "CSV",
    label: "preview workflow",
    detail: "Paste a patient list, validate rows, and prepare recall-ready drafts.",
    href: "/dashboard/import",
  },
];

const activity = [
  "Recall campaign draft created for hygiene patients due this month.",
  "Reminder queue reviewed for appointments scheduled tomorrow.",
  "Reactivation list filtered to patients with no visit in 18 months.",
  "Audit log placeholder reserved for future sensitive actions.",
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="flex flex-col gap-3 border-b border-line bg-white px-6 py-6 lg:px-8">
        <Badge>Clinic workspace</Badge>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold text-ink">Follow-up dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              A focused operating view for recall, reminders, no-show prevention, and patient
              reactivation. Data shown here is placeholder product scaffolding.
            </p>
          </div>
          <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
            Tenant context required before live data access
          </div>
        </div>
      </div>

      <section className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5 lg:p-8">
        {focusCards.map((card) => (
          <Card key={card.title}>
            <div className="flex min-h-36 flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{card.title}</p>
                <p className="mt-4 text-3xl font-semibold text-ink">{card.value}</p>
                <p className="mt-1 text-sm text-muted">{card.label}</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{card.detail}</p>
              {card.href ? (
                <Link
                  href={card.href}
                  className="mt-4 inline-flex w-fit text-sm font-semibold text-brand-700 hover:text-brand-600"
                >
                  Open recall queue
                </Link>
              ) : null}
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 px-6 pb-8 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Clinic activity</h2>
            <p className="mt-1 text-sm text-muted">Operational events will land here first.</p>
          </div>
          <div className="divide-y divide-line">
            {activity.map((item) => (
              <div key={item} className="px-5 py-4 text-sm leading-6 text-muted">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">Foundation status</h2>
          <dl className="mt-5 space-y-4">
            {[
              ["Auth", "planned"],
              ["Tenant isolation", "modeled"],
              ["Notifications", "module boundary"],
              ["AI orchestration", "assistant layer"],
            ].map(([name, status]) => (
              <div key={name} className="flex items-center justify-between gap-4">
                <dt className="text-sm text-muted">{name}</dt>
                <dd className="rounded bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
                  {status}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </DashboardShell>
  );
}
