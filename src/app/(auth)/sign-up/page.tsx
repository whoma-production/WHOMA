import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PublicHeader } from "@/components/layout/public-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { normalizeRedirectPath } from "@/lib/auth/session";
import { getPublicAuthProviderAvailability } from "@/lib/auth/provider-config";
import { PUBLIC_AGENT_JOURNEY } from "@/lib/public-proof";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF
} from "@/lib/public-site";
import { cn } from "@/lib/utils";

interface SignUpPageProps {
  searchParams?: Promise<{ role?: string; next?: string; error?: string }>;
}

const roleContent = {
  HOMEOWNER: {
    eyebrow: "Seller access",
    headline: "Request seller access.",
    body: "WHOMA currently opens seller access selectively to maintain a high-quality collaboration standard.",
    reassurance: [
      "Selective access",
      "Structured collaboration route",
      "Messaging opens after shortlist"
    ]
  },
  AGENT: {
    eyebrow: "Agent account",
    headline: "Create a profile clients, referrers, and collaborators can trust.",
    body: "WHOMA helps independent estate agents build a stronger professional presence before collaboration begins.",
    reassurance: [
      "Email verification",
      "Shareable public profile",
      "Proof that travels with you"
    ]
  }
} as const;

function normalizeRole(
  value: string | undefined
): "HOMEOWNER" | "AGENT" | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "HOMEOWNER") {
    return "HOMEOWNER";
  }

  if (normalized === "AGENT") {
    return "AGENT";
  }

  return null;
}

export default async function SignUpPage({
  searchParams
}: SignUpPageProps): Promise<JSX.Element> {
  const providerAvailability = getPublicAuthProviderAvailability();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParam = normalizeRedirectPath(resolvedSearchParams?.next) ?? null;
  const role = normalizeRole(resolvedSearchParams?.role);
  const content = role ? roleContent[role] : null;
  const site = getPublicSiteConfig();

  const entryTitle =
    role === "HOMEOWNER"
      ? "Request seller access"
      : providerAvailability.any
        ? "Create your account"
        : "Access support";
  const entryDescription =
    role === "HOMEOWNER"
      ? "Seller access is still handled through support. Tell us which area or brief you are asking about and we will route you correctly."
      : providerAvailability.any
        ? "Choose Google, Apple, or email to create your account, then continue to role selection and onboarding."
        : "Sign-in is temporarily unavailable. Contact support and we will help you regain access quickly.";

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />
      <main className="px-4 py-10">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <div className="flex justify-end">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-brand-ink underline"
            >
              Already have an account?
            </Link>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {content?.eyebrow ?? "Create your account"}
            </p>
            <h1>{content?.headline ?? "Create your WHOMA account."}</h1>
            <p className="max-w-3xl text-text-muted">
              {content?.body ??
                "WHOMA helps independent estate agents build verified public profiles and manage high-trust collaboration more clearly."}
            </p>
          </div>

          {!role ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-brand-accent/30 space-y-3 bg-surface-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Primary path
                </p>
                <h2 className="text-xl">I&apos;m an estate agent</h2>
                <p className="text-sm text-text-muted">
                  Create your public profile, add professional depth, and
                  publish it for review.
                </p>
                <Link
                  href={PUBLIC_AGENT_CTA_HREF}
                  className="text-sm font-medium text-brand-ink underline"
                >
                  Create your profile
                </Link>
              </Card>
              <Card className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Seller access
                </p>
                <h2 className="text-xl">I&apos;m requesting seller access</h2>
                <p className="text-sm text-text-muted">
                  Request seller access if you need help opening an instruction
                  through WHOMA.
                </p>
                <Link
                  href={PUBLIC_COLLABORATION_PILOT_HREF}
                  className="text-sm font-medium text-brand-ink underline"
                >
                  Contact support
                </Link>
              </Card>
            </div>
          ) : null}

          {content ? (
            <div className="grid gap-3 md:grid-cols-3">
              {content.reassurance.map((item) => (
                <Card
                  key={item}
                  className="bg-surface-0 px-4 py-3 text-sm text-text-muted"
                >
                  {item}
                </Card>
              ))}
            </div>
          ) : null}

          {role !== "HOMEOWNER" ? (
            <Card className="space-y-4 bg-surface-0">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  What your profile includes
                </p>
                <h2 className="text-xl">
                  Create your profile, add professional depth, and publish it.
                </h2>
                <p className="text-sm text-text-muted">
                  WHOMA is designed to help independent estate agents build a
                  stronger public presence before collaboration begins.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {PUBLIC_AGENT_JOURNEY.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-md border border-line bg-surface-1 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-text-strong">
                        {step.title}
                      </p>
                      <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-text-muted">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="mx-auto w-full max-w-xl space-y-4 text-center">
            <div className="space-y-1">
              <h2 className="text-xl">{entryTitle}</h2>
              <p className="text-sm text-text-muted">{entryDescription}</p>
            </div>
            {role === "HOMEOWNER" ? (
              <div className="rounded-md border border-line bg-surface-1 p-4 text-left">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-strong">Access</p>
                  <p className="text-sm text-text-muted">
                    If you need seller access, email {site.supportEmail} and we
                    will point you in the right direction.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`mailto:${site.supportEmail}`}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "sm" })
                    )}
                  >
                    Email support
                  </a>
                  <Link
                    href={PUBLIC_COLLABORATION_PILOT_HREF}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" })
                    )}
                  >
                    Contact page
                  </Link>
                </div>
              </div>
            ) : (
              <GoogleAuthButton
                providerAvailability={providerAvailability}
                authMode="sign-up"
                uxMode="public"
                supportEmail={site.supportEmail}
                nextParam={nextParam}
                oauthError={resolvedSearchParams?.error ?? null}
              />
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
