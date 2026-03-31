import Link from "next/link";
import { Suspense } from "react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_REQUESTS_PILOT_HREF
} from "@/lib/public-site";

interface SignUpPageProps {
  searchParams?: Promise<{ role?: string }>;
}

const roleContent = {
  HOMEOWNER: {
    eyebrow: "Homeowner pilot",
    headline: "Homeowner tendering is currently invite-led.",
    body: "WHOMA is validating verified agent identity first. Homeowner request access remains available only as a controlled pilot while the agent side builds public depth and trust.",
    reassurance: [
      "Secondary pilot path",
      "Agent identity comes first",
      "Use request browse as supporting context"
    ]
  },
  AGENT: {
    eyebrow: "Agent account",
    headline: "Build your verified estate agent profile",
    body: "Start with work-email verification, complete your structured professional profile, publish it, and move toward admin-reviewed public trust on WHOMA.",
    reassurance: [
      "Business email verification",
      "Structured public profile",
      "Admin-reviewed trust badge"
    ]
  }
} as const;

function normalizeRole(value: string | undefined): "HOMEOWNER" | "AGENT" | null {
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
  const role = normalizeRole(resolvedSearchParams?.role);
  const content = role ? roleContent[role] : null;
  const site = getPublicSiteConfig();

  const betaCtaHref =
    role === "HOMEOWNER" ? PUBLIC_REQUESTS_PILOT_HREF : PUBLIC_AGENT_DIRECTORY_HREF;
  const betaCtaLabel =
    role === "HOMEOWNER" ? "View pilot request areas" : "Browse verified agents";

  return (
    <main className="min-h-screen bg-surface-1 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Logo subtitle={site.logoSubtitle} />
          <Link href="/sign-in" className="text-sm font-medium text-brand-ink underline">
            Already have an account?
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            {content?.eyebrow ?? "Create your account"}
          </p>
          <h1>{content?.headline ?? "Join the WHOMA Phase 1 pilot"}</h1>
          <p className="max-w-3xl text-text-muted">
            {content?.body ??
              "WHOMA's primary public path is now verified estate agent identity. Agents build professional credibility first, while homeowner tendering remains a controlled pilot."}
          </p>
        </div>

        {!role ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3 border-brand-accent/30 bg-surface-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Primary public path
              </p>
              <h2 className="text-xl">I&apos;m an estate agent</h2>
              <p className="text-sm text-text-muted">
                Verify your business email, complete your structured profile, publish it, and work toward public
                verification.
              </p>
              <Link href={PUBLIC_AGENT_CTA_HREF} className="text-sm font-medium text-brand-ink underline">
                Continue as agent
              </Link>
            </Card>
            <Card className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Secondary pilot path
              </p>
              <h2 className="text-xl">I&apos;m exploring homeowner access</h2>
              <p className="text-sm text-text-muted">
                Homeowner tendering remains invite-led while WHOMA validates verified agent depth and trust.
              </p>
              <Link href="/sign-up?role=HOMEOWNER" className="text-sm font-medium text-brand-ink underline">
                Learn about the homeowner pilot
              </Link>
            </Card>
          </div>
        ) : null}

        {content ? (
          <div className="grid gap-3 md:grid-cols-3">
            {content.reassurance.map((item) => (
              <Card key={item} className="bg-surface-0 px-4 py-3 text-sm text-text-muted">
                {item}
              </Card>
            ))}
          </div>
        ) : null}

        <Card className="mx-auto w-full max-w-xl space-y-4 text-center">
          <div className="space-y-1">
            <h2 className="text-xl">
              {role === "HOMEOWNER" ? "Request pilot access" : "Start your account"}
            </h2>
            <p className="text-sm text-text-muted">
              {role === "HOMEOWNER"
                ? "If you already have pilot approval, continue with Google. Otherwise use the pilot information below."
                : "Continue with Google to enter the verified-profile workflow."}
            </p>
          </div>
          <Suspense fallback={<p className="text-sm text-text-muted">Loading sign-in options...</p>}>
            <GoogleAuthButton
              providerConfigured={providerConfigured}
              uxMode="public"
              betaSupportEmail={site.supportEmail}
              betaCtaHref={betaCtaHref}
              betaCtaLabel={betaCtaLabel}
              betaMessage={
                role === "HOMEOWNER"
                  ? "Homeowner access is currently coordinated manually while WHOMA keeps public focus on verified agent identity."
                  : "Public beta access is being staged carefully while WHOMA keeps its primary focus on verified agent identity."
              }
            />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
