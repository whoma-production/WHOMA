import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { normalizeRedirectPath } from "@/lib/auth/session";
import { PUBLIC_AGENT_JOURNEY } from "@/lib/public-proof";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF
} from "@/lib/public-site";

interface SignUpPageProps {
  searchParams?: Promise<{ role?: string; next?: string; error?: string }>;
}

const roleContent = {
  HOMEOWNER: {
    eyebrow: "Seller access",
    headline: "Request seller access.",
    body: "WHOMA currently opens seller access selectively to maintain a high-quality collaboration standard.",
    reassurance: [
      "Access by invitation",
      "Structured offer comparison",
      "Messaging opens after shortlist"
    ]
  },
  AGENT: {
    eyebrow: "Agent account",
    headline: "Create a profile clients, referrers, and collaborators can trust.",
    body: "WHOMA helps independent estate agents build a stronger professional presence before collaboration begins.",
    reassurance: [
      "Business email verification",
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
  const providerConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParam = normalizeRedirectPath(resolvedSearchParams?.next) ?? null;
  const role = normalizeRole(resolvedSearchParams?.role);
  const content = role ? roleContent[role] : null;
  const site = getPublicSiteConfig();

  const betaCtaHref =
    role === "HOMEOWNER"
      ? PUBLIC_COLLABORATION_PILOT_HREF
      : PUBLIC_AGENT_DIRECTORY_HREF;
  const betaCtaLabel =
    role === "HOMEOWNER"
      ? "Contact support"
      : "Browse verified agents";
  const entryTitle = providerConfigured
    ? role === "HOMEOWNER"
      ? "Request seller access"
      : "Create your profile"
    : role === "HOMEOWNER"
      ? "Request seller access"
      : "Request agent access";
  const entryDescription = providerConfigured
    ? role === "HOMEOWNER"
      ? "If your access is already approved, continue with Google. Otherwise contact support."
      : "Continue with Google to create your profile, add professional detail, and publish it."
    : role === "HOMEOWNER"
      ? "Seller access is handled through support. Tell us which area or brief you are asking about and we will route you correctly."
      : "Agent access is opened through support. Tell us where you work and how you plan to use WHOMA.";

  return (
    <main className="min-h-screen bg-surface-1 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Logo subtitle={site.logoSubtitle} />
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
          <h1>
            {content?.headline ??
              "Create your WHOMA account."}
          </h1>
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
                Create your public profile, add professional depth, and publish
                it for review.
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
          <GoogleAuthButton
            providerConfigured={providerConfigured}
            uxMode="public"
            betaSupportEmail={site.supportEmail}
            betaCtaHref={betaCtaHref}
            betaCtaLabel={betaCtaLabel}
            betaMessage={
              role === "HOMEOWNER"
                ? `If you need seller access, email ${site.supportEmail} and we will point you in the right direction.`
                : `If you need access, email ${site.supportEmail} with your role and area.`
            }
            nextParam={nextParam}
            oauthError={resolvedSearchParams?.error ?? null}
          />
        </Card>
      </div>
    </main>
  );
}
