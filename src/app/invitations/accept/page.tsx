import Link from "next/link";
import { AcceptInvitationForm } from "@/app/invitations/accept/accept-invitation-form";
import { SignInButton } from "@/components/auth/sign-in-button";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getInvitationAcceptancePreview,
  type InvitationAcceptancePreview,
} from "@/modules/tenants/invitations";
import { getCurrentUser, isDevelopmentAuthEnabled } from "@/server/auth";
import { getConfiguredAuthProviderIds, isRealAuthProviderConfigured } from "@/server/auth/config";
import { DatabaseUnavailableError } from "@/server/db";

export const dynamic = "force-dynamic";

type AcceptInvitationPageProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

type InvitationPageState =
  | {
      kind: "missing-token" | "invalid" | "expired" | "revoked" | "already-accepted";
      title: string;
      message: string;
    }
  | {
      kind: "email-mismatch" | "owner-role-blocked" | "unavailable";
      title: string;
      message: string;
    };

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const params = (await searchParams) ?? {};
  const token = parseToken(params.token);
  const callbackUrl = token
    ? `/invitations/accept?token=${encodeURIComponent(token)}`
    : "/invitations/accept";

  if (!token) {
    return (
      <InvitationAccessLayout>
        <StateCard state={invitationPageStates["missing-token"]} />
      </InvitationAccessLayout>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return (
      <InvitationAccessLayout>
        <Card>
          <Badge>Invitation access</Badge>
          <h1 className="mt-4 text-2xl font-semibold text-ink">Sign in to accept invitation</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Authenticate with the email address that received this invitation. Klinika360 validates
            the invitation after sign-in and creates access only for the invited clinic.
          </p>
          <SignInPanel callbackUrl={callbackUrl} />
        </Card>
      </InvitationAccessLayout>
    );
  }

  let preview;

  try {
    preview = await getInvitationAcceptancePreview(token, {
      email: user.email,
    });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return (
        <InvitationAccessLayout>
          <StateCard state={invitationPageStates.unavailable} />
        </InvitationAccessLayout>
      );
    }

    throw error;
  }

  if (preview.status !== "ready") {
    return (
      <InvitationAccessLayout>
        <StateCard state={invitationPageStates[preview.status]} />
      </InvitationAccessLayout>
    );
  }

  return (
    <InvitationAccessLayout>
      <Card>
        <Badge>{preview.invitation?.tenantName ?? "Clinic invitation"}</Badge>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Accept clinic access</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          This invitation will create a tenant-scoped membership for your authenticated account. The
          role and clinic are read from the invitation record.
        </p>
        <dl className="mt-5 grid gap-3 rounded-md border border-line bg-surface p-4 text-sm">
          <div>
            <dt className="font-semibold text-ink">Clinic</dt>
            <dd className="mt-1 text-muted">
              {preview.invitation?.tenantName ?? "Selected clinic"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Role</dt>
            <dd className="mt-1 text-muted">{formatRole(preview.invitation?.role ?? "STAFF")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Expires</dt>
            <dd className="mt-1 text-muted">
              {preview.invitation?.expiresAt
                ? formatDate(preview.invitation.expiresAt)
                : "Not available"}
            </dd>
          </div>
        </dl>
        <AcceptInvitationForm token={token} />
      </Card>
    </InvitationAccessLayout>
  );
}

function InvitationAccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface">
      <SiteHeader />
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-3xl items-center px-6 py-12 lg:px-8">
        {children}
      </section>
    </main>
  );
}

function StateCard({ state }: { state: InvitationPageState }) {
  return (
    <Card>
      <Badge>Invitation access</Badge>
      <h1 className="mt-4 text-2xl font-semibold text-ink">{state.title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{state.message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/sign-in"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Open dashboard
        </Link>
      </div>
    </Card>
  );
}

function SignInPanel({ callbackUrl }: { callbackUrl: string }) {
  const providerIds = getConfiguredAuthProviderIds();
  const hasGoogleProvider = providerIds.includes("google");
  const realAuthConfigured = isRealAuthProviderConfigured();
  const demoAuthEnabled = isDevelopmentAuthEnabled();

  return (
    <div className="mt-6 space-y-4">
      {realAuthConfigured && hasGoogleProvider ? (
        <SignInButton providerId="google" callbackUrl={callbackUrl} />
      ) : (
        <div className="rounded-md border border-line bg-surface p-4 text-sm leading-6 text-muted">
          Google OAuth is not configured for this environment. Production invitation acceptance
          requires a real authenticated provider session.
        </div>
      )}

      {demoAuthEnabled ? (
        <div className="rounded-md border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-700">
          Development demo mode is enabled. It is ignored in production.
          <div className="mt-3">
            <Link
              href={callbackUrl}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Continue with demo tenant
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const invitationPageStates: Record<
  Exclude<InvitationAcceptancePreview["status"], "ready"> | "missing-token" | "unavailable",
  InvitationPageState
> = {
  "missing-token": {
    kind: "missing-token",
    title: "Invitation link is missing",
    message: "Open the full invitation link to continue.",
  },
  invalid: {
    kind: "invalid",
    title: "Invitation link is invalid",
    message: "This invitation link is invalid or no longer available.",
  },
  expired: {
    kind: "expired",
    title: "Invitation expired",
    message: "Ask a clinic admin to send a new invitation.",
  },
  revoked: {
    kind: "revoked",
    title: "Invitation revoked",
    message: "This invitation has been revoked by the clinic team.",
  },
  already_accepted: {
    kind: "already-accepted",
    title: "Invitation already accepted",
    message: "This invitation has already been used.",
  },
  email_mismatch: {
    kind: "email-mismatch",
    title: "Different email address",
    message: "This invitation was issued for a different email address.",
  },
  owner_role_blocked: {
    kind: "owner-role-blocked",
    title: "Owner invitation blocked",
    message: "Owner invitations require a separate reviewed owner transfer workflow.",
  },
  unavailable: {
    kind: "unavailable",
    title: "Invitation access unavailable",
    message: "Invitation acceptance needs database access. Try again when it is available.",
  },
};

function parseToken(value: string | string[] | undefined): string {
  const token = Array.isArray(value) ? value[0] : value;
  return token?.trim() ?? "";
}

function formatRole(role: string): string {
  if (role === "CLINICIAN") {
    return "Doctor";
  }

  return role
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
