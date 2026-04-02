import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { normalizeRedirectPath } from "@/lib/auth/session";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF,
  PUBLIC_REQUESTS_PILOT_HREF
} from "@/lib/public-site";

interface SignUpPageProps {
  searchParams?: Promise<{ role?: string; next?: string; error?: string }>;
}

const roleContent = {
  HOMEOWNER: {
    eyebrow: "Collaboration pilot",
    headline: "Join the limited homeowner collaboration pilot.",
    body: "Homeowner access is coordinated manually while WHOMA validates verified estate-agent identity, agent-owned reputation, and structured collaboration records first.",
    reassurance: [
      "Limited pilot access",
      "Structured offer comparison only",
      "Messaging unlocks after shortlist"
    ]
  },
  AGENT: {
    eyebrow: "Agent account",
    headline: "Build your verified estate agent profile",
    body: "Start with work-email verification, publish your profile, and build an agent-owned reputation record before broader marketplace expansion.",
    reassurance: [
      "Business email verification",
      "Portable public profile",
      "Admin-reviewed trust badge"
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
      ? PUBLIC_REQUESTS_PILOT_HREF
      : PUBLIC_AGENT_DIRECTORY_HREF;
  const betaCtaLabel =
    role === "HOMEOWNER"
      ? "View pilot request areas"
      : "Browse verified agents";

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
          <h1>{content?.headline ?? "Join the WHOMA controlled pilot"}</h1>
          <p className="max-w-3xl text-text-muted">
            {content?.body ??
              "WHOMA leads with verified estate-agent identity, agent-owned reputation, and structured collaboration. Homeowner access remains a limited pilot path."}
          </p>
        </div>

        {!role ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-brand-accent/30 space-y-3 bg-surface-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Primary public path
              </p>
              <h2 className="text-xl">I&apos;m an estate agent</h2>
              <p className="text-sm text-text-muted">
                Verify your business email, publish a structured profile, and
                build a portable reputation record you can carry into future
                instructions.
              </p>
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className="text-sm font-medium text-brand-ink underline"
              >
                Build your verified profile
              </Link>
            </Card>
            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Secondary pilot path
              </p>
              <h2 className="text-xl">I&apos;m exploring homeowner access</h2>
              <p className="text-sm text-text-muted">
                Join the limited collaboration pilot only if you need manual
                homeowner access while WHOMA keeps its public focus on
                estate-agent trust infrastructure.
              </p>
              <Link
                href={PUBLIC_COLLABORATION_PILOT_HREF}
                className="text-sm font-medium text-brand-ink underline"
              >
                Join collaboration pilot
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

        <Card className="mx-auto w-full max-w-xl space-y-4 text-center">
          <div className="space-y-1">
            <h2 className="text-xl">
              {role === "HOMEOWNER"
                ? "Request pilot access"
                : "Start your account"}
            </h2>
            <p className="text-sm text-text-muted">
              {role === "HOMEOWNER"
                ? "If you already have pilot approval, continue with Google. Otherwise use the direct support route below."
                : "Continue with Google to enter the verified-profile workflow without placeholder steps or dead-end loaders."}
            </p>
          </div>
          <GoogleAuthButton
            providerConfigured={providerConfigured}
            uxMode="public"
            betaSupportEmail={site.supportEmail}
            betaCtaHref={betaCtaHref}
            betaCtaLabel={betaCtaLabel}
            betaMessage={
              role === "HOMEOWNER"
                ? "Homeowner access is coordinated manually while WHOMA keeps its public focus on verified estate-agent identity first."
                : "Google sign-in is opened in stages. If your access is not live yet, use the monitored support route."
            }
            nextParam={nextParam}
            oauthError={resolvedSearchParams?.error ?? null}
          />
        </Card>
      </div>
    </main>
  );
}
