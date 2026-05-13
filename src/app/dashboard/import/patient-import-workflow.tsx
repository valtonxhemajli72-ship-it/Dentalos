"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  persistPatientImportAction,
  previewPatientImportAction,
  type PatientImportActionResult,
} from "@/app/dashboard/import/actions";
import { Card } from "@/components/ui/card";
import {
  createPatientImportClientPreview,
  patientImportExampleCsv,
  type PatientImportClientPreview,
} from "@/modules/patient-import";

const summaryCards: Array<{
  key: keyof PatientImportClientPreview["summary"];
  label: string;
}> = [
  { key: "rowCount", label: "Rows parsed" },
  { key: "validRowCount", label: "Ready drafts" },
  { key: "invalidRowCount", label: "Needs cleanup" },
  { key: "phoneCount", label: "Phone indicators" },
];

export function PatientImportWorkflow() {
  const [csvText, setCsvText] = useState(patientImportExampleCsv);
  const [preview, setPreview] = useState<PatientImportClientPreview>(() =>
    createPatientImportClientPreview(patientImportExampleCsv),
  );
  const [actionResult, setActionResult] = useState<PatientImportActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const canContinue = preview.summary.validRowCount > 0;
  const issueSummary = useMemo(() => {
    const issueCodes = new Set(preview.issues.map((issue) => issue.code));
    return Array.from(issueCodes).join(", ") || "No validation issues";
  }, [preview.issues]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Paste patient CSV</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Use this MVP flow to preview a clinic list before recall review. No records are saved
            and no messages are sent from this demo workflow.
          </p>
        </div>
        <div className="p-5">
          <label htmlFor="patient-import-csv" className="text-sm font-semibold text-ink">
            CSV content
          </label>
          <textarea
            id="patient-import-csv"
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value);
              setActionResult(null);
            }}
            className="mt-2 min-h-72 w-full resize-y rounded-md border border-line bg-white p-4 font-mono text-sm leading-6 text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            spellCheck={false}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  const result = await previewPatientImportAction(csvText);
                  setPreview(result.preview);
                  setActionResult(result);
                });
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              disabled={isPending}
            >
              Preview import
            </button>
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  const result = await persistPatientImportAction(csvText);
                  setPreview(result.preview);
                  setActionResult(result);
                });
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canContinue || isPending}
            >
              Save valid patients
            </button>
            <Link
              href="/dashboard/recall"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Continue to recall review
            </Link>
          </div>
          {actionResult ? (
            <div
              className={`mt-4 rounded-md border px-4 py-3 text-sm leading-6 ${
                actionResult.ok
                  ? "border-brand-100 bg-brand-50 text-brand-700"
                  : "border-line bg-surface text-muted"
              }`}
              role="status"
            >
              <p className="font-semibold">{actionResult.message}</p>
              {actionResult.persistence ? (
                <p className="mt-1">
                  Created {actionResult.persistence.createdPatients} patients; skipped{" "}
                  {actionResult.persistence.skippedRows} rows; source{" "}
                  {actionResult.persistence.source}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-6">
        <Card>
          <h2 className="text-base font-semibold text-ink">Preview summary</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {summaryCards.map((card) => (
              <div key={card.key} className="rounded-md border border-line bg-surface p-3">
                <p className="text-xs font-semibold uppercase text-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{preview.summary[card.key]}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">Validation: {issueSummary}</p>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-ink">Expected CSV columns</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            firstName, lastName, email, phone, lastVisitDate, nextAppointmentDate,
            preferredContactChannel, and notes. Dates should use YYYY-MM-DD.
          </p>
        </Card>
      </aside>

      <section className="lg:col-span-2">
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Import preview</h2>
            <p className="mt-1 text-sm text-muted">
              Contact values are masked in the preview. Validation metadata uses counts only.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-surface text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-5 py-3">Row</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Contact indicators</th>
                  <th className="px-5 py-3">Preferred channel</th>
                  <th className="px-5 py-3">Dates</th>
                  <th className="px-5 py-3">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-5 py-4 font-semibold text-ink">{row.rowNumber}</td>
                    <td className="px-5 py-4 text-ink">{row.label}</td>
                    <td className="px-5 py-4 text-muted">{row.contactIndicators.join(", ")}</td>
                    <td className="px-5 py-4 text-muted">
                      {row.preferredContactChannel.toUpperCase()}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      <div>Last visit: {row.lastVisitDate ?? "not provided"}</div>
                      <div className="mt-1">Next visit: {row.nextAppointmentDate ?? "none"}</div>
                    </td>
                    <td className="px-5 py-4">
                      {row.issues.length === 0 ? (
                        <span className="rounded bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                          Ready
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {row.issues.map((issue) => (
                            <p
                              key={`${issue.rowNumber}-${issue.code}`}
                              className="text-xs text-clinic-rose"
                            >
                              {issue.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
