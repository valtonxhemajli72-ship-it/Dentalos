import Link from "next/link";
import { SignInButton } from "@/components/auth/sign-in-button";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { getConfiguredAuthProviderIds, isRealAuthProviderConfigured } from "@/server/auth/config";
import { isDevelopmentAuthEnabled } from "@/server/auth";

export default function SignInPage() {
  const providerIds = getConfiguredAuthProviderIds();
  const hasGoogleProvider = providerIds.includes("google");
  const realAuthConfigured = isRealAuthProviderConfigured();
  const demoAuthEnabled = isDevelopmentAuthEnabled();

  return (
    <main className="min-h-screen bg-surface">
      <SiteHeader />
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-6 px-6 py-12 lg:grid-cols-[1fr_420px] lg:px-8">
        <div>
          <Badge>Secure clinic access</Badge>
          <h1 className="mt-4 text-3xl font-semibold text-ink">Sign in to {APP_NAME}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Use a configured identity provider to access tenant-scoped patient import, recall, and
            dashboard workflows. Signed-in users must already be provisioned in Klinika360 with a
            tenant membership before private clinic data is shown.
          </p>
        </div>

        <Card>
          <h2 className="text-base font-semibold text-ink">Authentication</h2>
          <div className="mt-5 space-y-4">
            {realAuthConfigured && hasGoogleProvider ? (
              <SignInButton providerId="google" />
            ) : (
              <div className="rounded-md border border-line bg-surface p-4 text-sm leading-6 text-muted">
                Google OAuth is not configured for this environment. Set placeholder-free
                `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` values in the deployment
                environment before production use.
              </div>
            )}

            {demoAuthEnabled ? (
              <div className="rounded-md border border-brand-100 bg-brand-50 p-4 text-sm leading-6 text-brand-700">
                Development demo mode is enabled. It is ignored in production.
                <div className="mt-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    Continue with demo tenant
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </section>
    </main>
  );
}
