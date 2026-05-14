"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  acceptInvitationAction,
  type AcceptInvitationActionState,
} from "@/app/invitations/accept/actions";

type AcceptInvitationFormProps = {
  token: string;
};

const initialState: AcceptInvitationActionState = {
  status: "idle",
  message: "",
};

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const [state, formAction, isPending] = useActionState(acceptInvitationAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.message ? (
        <div
          className="rounded-md border border-line bg-surface p-4 text-sm leading-6 text-muted"
          role="status"
        >
          {state.message}
          {state.dashboardHref ? (
            <div className="mt-3">
              <Link
                href={state.dashboardHref}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                Open dashboard
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Accepting invitation..." : "Accept invitation"}
      </button>
    </form>
  );
}
