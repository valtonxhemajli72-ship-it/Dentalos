"use client";

import { useActionState, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  campaignChannelOptions,
  prepareCampaignPreview,
  type RecallCampaignChannel,
} from "@/modules/recall";
import {
  createRecallCampaignDraftAction,
  initialRecallCampaignActionState,
} from "@/app/dashboard/recall/campaigns/actions";

export type CampaignBuilderCandidate = {
  id: string;
  displayName: string;
  dueLabel: string;
  dueDistance: string;
  statusLabel: string;
  preferredChannel: string;
  recommendedActionLabel: string;
  riskNote: string;
  priorityScore: number;
  defaultSelected: boolean;
  eligible: boolean;
};

type RecallCampaignBuilderFormProps = {
  tenantName: string;
  source: "database" | "demo" | "unavailable";
  candidates: CampaignBuilderCandidate[];
};

export function RecallCampaignBuilderForm({
  tenantName,
  source,
  candidates,
}: RecallCampaignBuilderFormProps) {
  const [state, formAction, isPending] = useActionState(
    createRecallCampaignDraftAction,
    initialRecallCampaignActionState,
  );
  const [channel, setChannel] = useState<RecallCampaignChannel>("SMS");
  const [selectedIds, setSelectedIds] = useState(
    () =>
      new Set(
        candidates
          .filter((candidate) => candidate.defaultSelected && candidate.eligible)
          .map((candidate) => candidate.id),
      ),
  );
  const preview = useMemo(
    () =>
      prepareCampaignPreview({
        channel,
        audienceCount: selectedIds.size,
      }),
    [channel, selectedIds.size],
  );
  const canSave = source === "database" && selectedIds.size > 0 && !isPending;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge>{tenantName}</Badge>
              <h2 className="mt-3 text-lg font-semibold text-ink">Campaign setup</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Prepare a draft from tenant-scoped recall candidates. The audience is validated on
                the server before the draft is saved.
              </p>
            </div>
            <Badge className="border-amber-100 bg-amber-50 text-clinic-amber">
              No-send workflow
            </Badge>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="campaign-name" className="text-sm font-semibold text-ink">
                Campaign name
              </label>
              <input
                id="campaign-name"
                name="name"
                type="text"
                required
                maxLength={80}
                defaultValue="Monthly recall draft"
                aria-describedby="campaign-name-help campaign-name-error"
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              <p id="campaign-name-help" className="mt-2 text-xs leading-5 text-muted">
                Use an internal working name. Do not include patient names.
              </p>
              {state.fieldErrors?.name ? (
                <p id="campaign-name-error" className="mt-2 text-sm text-clinic-rose">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="campaign-channel" className="text-sm font-semibold text-ink">
                Channel placeholder
              </label>
              <select
                id="campaign-channel"
                name="channel"
                value={channel}
                onChange={(event) => setChannel(event.target.value as RecallCampaignChannel)}
                aria-describedby="campaign-channel-help campaign-channel-error"
                className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                {campaignChannelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p id="campaign-channel-help" className="mt-2 text-xs leading-5 text-muted">
                {campaignChannelOptions.find((option) => option.value === channel)?.description}
              </p>
              {state.fieldErrors?.channel ? (
                <p id="campaign-channel-error" className="mt-2 text-sm text-clinic-rose">
                  {state.fieldErrors.channel}
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <fieldset>
            <legend className="text-lg font-semibold text-ink">Recall audience</legend>
            <p className="mt-2 text-sm leading-6 text-muted">
              Select patients from this clinic recall queue. Scheduled or not-ready patients are
              shown for context but cannot be added to this draft.
            </p>
            {state.fieldErrors?.patientIds ? (
              <p className="mt-3 text-sm text-clinic-rose">{state.fieldErrors.patientIds}</p>
            ) : null}

            <div className="mt-5 divide-y divide-line overflow-hidden rounded-md border border-line">
              {candidates.map((candidate) => (
                <label
                  key={candidate.id}
                  className="grid cursor-pointer gap-3 bg-white p-4 transition hover:bg-surface sm:grid-cols-[auto_minmax(0,1fr)_120px]"
                >
                  <input
                    type="checkbox"
                    name="patientIds"
                    value={candidate.id}
                    checked={selectedIds.has(candidate.id)}
                    disabled={!candidate.eligible}
                    onChange={(event) => {
                      const nextSelected = new Set(selectedIds);
                      if (event.target.checked) {
                        nextSelected.add(candidate.id);
                      } else {
                        nextSelected.delete(candidate.id);
                      }
                      setSelectedIds(nextSelected);
                    }}
                    className="mt-1 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-100 disabled:cursor-not-allowed"
                  />
                  <span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{candidate.displayName}</span>
                      <span className="rounded bg-surface px-2 py-1 text-xs font-semibold text-muted">
                        {candidate.statusLabel}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted">
                      {candidate.recommendedActionLabel}. {candidate.riskNote}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {candidate.dueLabel} - {candidate.dueDistance} - {candidate.preferredChannel}
                    </span>
                  </span>
                  <span className="text-left text-sm font-semibold text-ink sm:text-right">
                    {candidate.priorityScore}
                  </span>
                </label>
              ))}

              {candidates.length === 0 ? (
                <div className="bg-white p-5 text-sm leading-6 text-muted">
                  No recall candidates are available for campaign preparation.
                </div>
              ) : null}
            </div>
          </fieldset>
        </Card>
      </div>

      <aside className="space-y-6">
        <Card>
          <h2 className="text-base font-semibold text-ink">Audience summary</h2>
          <dl className="mt-5 space-y-4">
            <SummaryItem label="Selected patients" value={`${selectedIds.size}`} />
            <SummaryItem label="Channel" value={preview.channelLabel} />
            <SummaryItem label="Source" value={source} />
          </dl>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-ink">Message template preview</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This is a generic placeholder. Patient-specific message delivery is not implemented.
          </p>
          <div className="mt-4 whitespace-pre-line rounded-md border border-line bg-surface p-4 text-sm leading-6 text-ink">
            {preview.preview}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-ink">Review before save</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>Audience is revalidated against the current tenant on submit.</li>
            <li>Campaign status is saved as DRAFT before review.</li>
            <li>No SMS, email, WhatsApp, or phone delivery is triggered.</li>
            <li>Audit metadata records counts, status, and channel only.</li>
          </ul>
          <div className="mt-5 rounded-md border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-clinic-amber">
            No messages are sent from this workflow.
          </div>
          {state.status === "error" && state.message ? (
            <p role="alert" className="mt-4 text-sm text-clinic-rose">
              {state.message}
            </p>
          ) : null}
          {source !== "database" ? (
            <p className="mt-4 text-sm leading-6 text-muted">
              Draft saving needs a configured database. Demo and unavailable states are preview
              only.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canSave}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving draft" : "Create draft"}
          </button>
        </Card>
      </aside>
    </form>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
