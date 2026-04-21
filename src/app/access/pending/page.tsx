import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicSiteConfig } from "@/lib/public-site";

export default async function PendingAccessPage(): Promise<JSX.Element> {
  const session = await auth();
  const site = getPublicSiteConfig();

  if (!session?.user?.id) {
    redirect("/sign-in?next=/access/pending");
  }

  if (session.user.role !== "AGENT") {
    redirect("/onboarding/role");
  }

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader showNav={false} />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Access review
          </p>
          <h1 className="text-3xl font-semibold text-text-strong">
            Your profile is under review.
          </h1>
          <p className="text-sm text-text-muted">
            You are signed in successfully. WHOMA is currently reviewing your
            profile details before full agent access is enabled.
          </p>
          <p className="text-sm text-text-muted">
            Need an update? Contact{" "}
            <a
              href={`mailto:${site.supportEmail}`}
              className="font-medium text-brand-ink underline"
            >
              {site.supportEmail}
            </a>
            .
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="text-sm font-medium text-brand-ink underline">
              Contact support
            </Link>
            <form
              action={async (): Promise<void> => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
            >
              <Button type="submit" variant="tertiary">
                Sign out
              </Button>
            </form>
          </div>
        </Card>
      </main>
    </div>
  );
}
