"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  campaignChannelOptions,
  MAX_CAMPAIGN_MESSAGE_TEMPLATE_LENGTH,
  type CampaignReviewState,
  type RecallCampaignStatus,
} from "@/modules/recall";
import {
  approveRecallCampaignAction,
  cancelRecallCampaignAction,
  initialRecallCampaignActionState,
  submitRecallCampaignForReviewAction,
  updateRecallCampaignDraftAction,
} from "@/app/dashboard/recall/campaigns/actions";

type RecallCampaignReviewFormProps = {
  reviewState: CampaignReviewState;
  canApproveByRole: boolean;
};

const statusLabels: Record<RecallCampaignStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export function RecallCampaignReviewForm({
  reviewState,
  canApproveByRole,
}: RecallCampaignReviewFormProps) {
  const [updateState, updateAction, isUpdating] = useActionState(
    updateRecallCampaignDraftAction,
    initialRecallCampaignActionState,
  );
  const [submitState, submitAction, isSubmitting] = useActionState(
    submitRecallCampaignForReviewAction,
    initialRecallCampaignActionState,
  );
  const [approveState, approveAction, isApproving] = useActionState(
    approveRecallCampaignAction,
    initialRecallCampaignActionState,
  );
  const [cancelState, cancelAction, isCancelling] = useActionState(
    cancelRecallCampaignAction,
    initialRecallCampaignActionState,
  );
  const { campaign } = reviewState;
  const currentTemplate = campaign.messageTemplate ?? campaign.templatePreview ?? "";
  const channelDescription =
    campaignChannelOptions.find((option) => option.value === campaign.channel)?.description ??
    "No-send channel placeholder.";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge>{statusLabels[campaign.status]}</Badge>
              <h2 className="mt-3 text-lg font-semibold text-ink">Campaign review</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Review the campaign draft, message template, and selected audience before approval.
              </p>
            </div>
            <Badge className="border-amber-100 bg-amber-50 text-clinic-amber">
              No-send workflow
            </Badge>
          </div>
        </Card>

        {reviewState.canEditDraft ? (
          <form action={updateAction}>
            <Card>
              <input type="hidden" name="campaignId" value={campaign.id} />
              <div className="grid gap-5 md:grid-cols-2">
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
                    defaultValue={campaign.name}
                    aria-describedby="campaign-name-help campaign-name-error"
                    className="mt-2 min-h-11 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                  <p id="campaign-name-help" className="mt-2 text-xs leading-5 text-muted">
                    Use an internal working name. Do not include patient names.
                  </p>
                  {updateState.fieldErrors?.name ? (
                    <p id="campaign-name-error" className="mt-2 text-sm text-clinic-rose">
                      {updateState.fieldErrors.name}
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
                    defaultValue={campaign.channel}
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
                    {channelDescription}
                  </p>
                  {updateState.fieldErrors?.channel ? (
                    <p id="campaign-channel-error" className="mt-2 text-sm text-clinic-rose">
                      {updateState.fieldErrors.channel}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="campaign-template" className="text-sm font-semibold text-ink">
                  Message template
                </label>
                <textarea
                  id="campaign-template"
                  name="template"
                  required
                  maxLength={MAX_CAMPAIGN_MESSAGE_TEMPLATE_LENGTH}
                  defaultValue={currentTemplate}
                  rows={7}
                  aria-describedby="campaign-template-help campaign-template-error"
                  className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
                <p id="campaign-template-help" className="mt-2 text-xs leading-5 text-muted">
                  Keep this generic. Do not include patient names, contact details, treatment notes,
                  or delivery-provider fields.
                </p>
                {updateState.fieldErrors?.template ? (
                  <p id="campaign-template-error" className="mt-2 text-sm text-clinic-rose">
                    {updateState.fieldErrors.template}
                  </p>
                ) : null}
              </div>

              {updateState.status === "error" && updateState.message ? (
                <p role="alert" className="mt-4 text-sm text-clinic-rose">
                  {updateState.message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isUpdating}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating ? "Saving draft" : "Save draft edits"}
              </button>
            </Card>
          </form>
        ) : (
          <Card>
            <h2 className="text-base font-semibold text-ink">Locked message template</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Message editing is available only while a campaign is in Draft.
            </p>
            <div className="mt-4 whitespace-pre-line rounded-md border border-line bg-surface p-4 text-sm leading-6 text-ink">
              {currentTemplate || "No message template saved."}
            </div>
          </Card>
        )}
      </div>

      <aside className="space-y-6">
        <Card>
          <h2 className="text-base font-semibold text-ink">Audience summary</h2>
          <dl className="mt-5 space-y-4">
            <SummaryItem
              label="Selected candidates"
              value={`${campaign.selectedPatients.length}`}
            />
            <SummaryItem label="Audience count" value={`${campaign.audienceCount}`} />
            <SummaryItem label="Channel" value={campaign.channel} />
            <SummaryItem label="Status" value={statusLabels[campaign.status]} />
          </dl>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-ink">Review controls</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Approval records readiness only. It does not enqueue, send, or call any delivery
            provider.
          </p>
          <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-clinic-amber">
            {reviewState.noSendNotice}
          </div>

          {reviewState.canSubmitForReview ? (
            <form action={submitAction} className="mt-5">
              <input type="hidden" name="campaignId" value={campaign.id} />
              {submitState.status === "error" && submitState.message ? (
                <p role="alert" className="mb-3 text-sm text-clinic-rose">
                  {submitState.message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting" : "Submit for review"}
              </button>
            </form>
          ) : null}

          {reviewState.canApprove ? (
            <form action={approveAction} className="mt-3">
              <input type="hidden" name="campaignId" value={campaign.id} />
              {approveState.status === "error" && approveState.message ? (
                <p role="alert" className="mb-3 text-sm text-clinic-rose">
                  {approveState.message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={!canApproveByRole || isApproving}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {canApproveByRole
                  ? isApproving
                    ? "Approving"
                    : "Approve campaign"
                  : "Approval permission required"}
              </button>
            </form>
          ) : null}

          {reviewState.canCancel ? (
            <form action={cancelAction} className="mt-3">
              <input type="hidden" name="campaignId" value={campaign.id} />
              {cancelState.status === "error" && cancelState.message ? (
                <p role="alert" className="mb-3 text-sm text-clinic-rose">
                  {cancelState.message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isCancelling}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling ? "Cancelling" : "Cancel campaign"}
              </button>
            </form>
          ) : null}
        </Card>
      </aside>
    </div>
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
