import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function SignOutPage() {
  return (
    <main className="min-h-screen bg-surface">
      <SiteHeader />
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center px-6 py-12">
        <Badge>Session</Badge>
        <Card>
          <h1 className="text-2xl font-semibold text-ink">Sign out</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            End the current authentication session on this device. Patient data, audit metadata, and
            tenant records are not changed by signing out.
          </p>
          <div className="mt-6">
            <SignOutButton />
          </div>
        </Card>
      </section>
    </main>
  );
}
