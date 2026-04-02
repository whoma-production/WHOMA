import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { buttonVariants } from "@/components/ui/button";
import {
  getPublicSiteConfig,
  getSupportMailto,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF
} from "@/lib/public-site";
import {
  PUBLIC_COLLABORATION_FLOW,
  PUBLIC_PROOF_MODULES,
  PUBLIC_SAMPLE_COMPARISON,
  PUBLIC_SAMPLE_PROFILE_VIEW,
  PUBLIC_WHY_AGENTS_JOIN
} from "@/lib/public-proof";
import { cn } from "@/lib/utils";
import { listPublicAgentProfiles } from "@/server/agent-profile/service";
import {
  getLiveInstructionCards,
  getLiveInstructionLocationSummaries
} from "@/server/marketplace/queries";

export const dynamic = "force-dynamic";

export default async function LandingPage(): Promise<JSX.Element> {
  const site = getPublicSiteConfig();

  let publicAgents = [] as Awaited<ReturnType<typeof listPublicAgentProfiles>>;
  let liveInstructions = [] as Awaited<
    ReturnType<typeof getLiveInstructionCards>
  >;

  if (process.env.DATABASE_URL) {
    [publicAgents, liveInstructions] = await Promise.all([
      listPublicAgentProfiles({ limit: 100 }),
      getLiveInstructionCards()
    ]);
  }

  const featuredAgent = publicAgents[0] ?? null;
  const locationSummaries =
    getLiveInstructionLocationSummaries(liveInstructions);

  const featuredProof = featuredAgent
    ? {
        name: featuredAgent.user.name ?? "Estate agent",
        role: featuredAgent.jobTitle ?? "Independent estate agent",
        agency: featuredAgent.agencyName ?? "Independent",
        serviceAreas: featuredAgent.serviceAreas,
        specialties: featuredAgent.specialties,
        profileCompleteness: featuredAgent.profileCompleteness,
        yearsExperience: featuredAgent.yearsExperience,
        publishedAt: featuredAgent.publishedAt,
        image: featuredAgent.user.image ?? null,
        href: featuredAgent.profileSlug
          ? (`/agents/${featuredAgent.profileSlug}` as Route)
          : PUBLIC_AGENT_DIRECTORY_HREF
      }
    : null;

  const sellerAccessNote =
    locationSummaries.length > 0
      ? `Seller access is currently visible in ${locationSummaries.length} ${
          locationSummaries.length === 1 ? "area" : "areas"
        }.`
      : "Seller access opens carefully as matching supply and moderation come into place.";

  const featuredProfileFacts = [
    {
      label: "Service areas",
      value:
        featuredProof?.serviceAreas.slice(0, 3).join(", ") ||
        "Visible once the first production profile is public"
    },
    {
      label: "Specialties",
      value:
        featuredProof?.specialties.slice(0, 3).join(", ") ||
        "Professional profile in progress"
    },
    {
      label: "Verification",
      value: featuredAgent ? "Admin verified" : "Awaiting first live profile"
    },
    {
      label: "Experience",
      value:
        featuredProof?.yearsExperience !== null &&
        featuredProof?.yearsExperience !== undefined
          ? `${featuredProof.yearsExperience} years`
          : "Self-reported once the profile is live"
    },
    {
      label: "Profile readiness",
      value: `${featuredProof?.profileCompleteness ?? 0}% complete`
    }
  ] as const;

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />

          <nav
            className="hidden items-center gap-5 text-sm text-text-muted lg:flex"
            aria-label="Primary"
          >
            <Link
              href="/#platform"
              className="transition-colors hover:text-text-strong"
            >
              Platform
            </Link>
            <Link
              href="/#how-it-works"
              className="transition-colors hover:text-text-strong"
            >
              How it works
            </Link>
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className="transition-colors hover:text-text-strong"
            >
              Agents
            </Link>
            <Link
              href={PUBLIC_COLLABORATION_PILOT_HREF}
              className="transition-colors hover:text-text-strong"
            >
              Support
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" })
              )}
            >
              Sign in
            </Link>
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Build your verified profile
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="public-section border-b border-line bg-surface-1">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
            <div className="max-w-2xl space-y-6">
              <p className="public-kicker">For independent estate agents</p>
              <div className="space-y-4">
                <h1 className="max-w-3xl">
                  The professional layer for independent estate agents.
                </h1>
                <p className="max-w-xl text-base text-text-muted sm:text-lg">
                  {site.pilotSummary}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={PUBLIC_AGENT_CTA_HREF}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "lg" })
                  )}
                >
                  Create your profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={PUBLIC_AGENT_DIRECTORY_HREF}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" })
                  )}
                >
                  Browse verified agents
                </Link>
                <Link
                  href="/sign-in"
                  className={cn(
                    buttonVariants({ variant: "tertiary", size: "lg" })
                  )}
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="public-record space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="public-kicker">Featured profile</p>
                  <h2 className="text-2xl">
                    {featuredProof?.name ?? "Featured profile unlocks after live verification"}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {featuredProof
                      ? `${featuredProof.role} · ${featuredProof.agency}`
                      : "A real production-verified profile appears here once admin review is complete"}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface-1 text-sm font-semibold text-text-strong">
                  {featuredProof?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredProof.image}
                      alt={featuredProof.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    (featuredProof?.name ?? "WHOMA")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {featuredProfileFacts.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <p className="public-kicker">{item.label}</p>
                    <p className="text-sm text-text-strong">{item.value}</p>
                  </div>
                ))}
              </div>

              <p className="max-w-xl text-sm text-text-muted">
                {featuredAgent
                  ? "This is a live production-verified public profile."
                  : "Live public examples appear here only after a real agent profile clears verification."}
              </p>
            </div>
          </div>
        </section>

        <section id="platform" className="public-section bg-surface-0">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <p className="public-kicker">Platform</p>
              <h2>WHOMA makes professional standing easier to understand.</h2>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {PUBLIC_WHY_AGENTS_JOIN.map((item) => (
                <div key={item.title} className="space-y-3 border-t border-line pt-4">
                  <h3>{item.title}</h3>
                  <p className="text-sm text-text-muted sm:text-base">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section border-y border-line bg-surface-1">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="public-kicker">Featured profile</p>
                <h2>A public profile should make professional standing easy to read.</h2>
                <p className="max-w-2xl text-sm text-text-muted sm:text-base">
                  WHOMA brings identity, profile depth, and collaboration
                  readiness into one page that can be shared with confidence.
                </p>
              </div>

              <div className="public-record space-y-4">
                <div className="public-divider" />
                <p className="text-sm leading-7 text-text-base">
                  {featuredAgent
                    ? "This live profile is public because it has been published and admin verified."
                    : "This space switches from placeholder to live profile once the first production-verified agent is public."}
                </p>
                <Link
                  href={(featuredProof?.href ?? PUBLIC_AGENT_CTA_HREF) as Route}
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  {featuredAgent ? "View this profile" : "Build your verified profile"}
                </Link>
              </div>
            </div>

            <div className="public-record space-y-5" id="featured-profile">
              <div className="space-y-2">
                <p className="public-kicker">{PUBLIC_SAMPLE_PROFILE_VIEW.eyebrow}</p>
                <h3 className="text-2xl">{PUBLIC_SAMPLE_PROFILE_VIEW.title}</h3>
                <p className="text-sm text-text-muted sm:text-base">
                  {PUBLIC_SAMPLE_PROFILE_VIEW.summary}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {PUBLIC_SAMPLE_PROFILE_VIEW.fields.map((field) => (
                  <div
                    key={field.label}
                    className="border-t border-line pt-3"
                  >
                    <p className="public-kicker">{field.label}</p>
                    <p className="mt-1 text-sm text-text-strong">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="public-section bg-surface-0">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <p className="public-kicker">How it works</p>
              <h2>Professional detail becomes more useful when it is structured.</h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {PUBLIC_PROOF_MODULES.map((item) => (
                <div key={item.title} className="public-record space-y-3">
                  <h3>{item.title}</h3>
                  <p className="text-sm text-text-muted sm:text-base">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="public-section border-y border-line bg-surface-1">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="public-kicker">{PUBLIC_COLLABORATION_FLOW.eyebrow}</p>
                <h2>{PUBLIC_COLLABORATION_FLOW.title}</h2>
                <p className="text-sm text-text-muted sm:text-base">
                  {PUBLIC_COLLABORATION_FLOW.summary}
                </p>
              </div>

              <div className="space-y-5">
                {PUBLIC_COLLABORATION_FLOW.steps.map((step) => (
                  <div key={step.title} className="border-t border-line pt-4">
                    <h3>{step.title}</h3>
                    <p className="mt-2 text-sm text-text-muted sm:text-base">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="public-record space-y-5">
              <div className="space-y-2">
                <p className="public-kicker">{PUBLIC_SAMPLE_COMPARISON.eyebrow}</p>
                <h3 className="text-2xl">{PUBLIC_SAMPLE_COMPARISON.title}</h3>
                <p className="text-sm text-text-muted sm:text-base">
                  {PUBLIC_SAMPLE_COMPARISON.summary}
                </p>
              </div>

              <div className="space-y-3">
                {PUBLIC_SAMPLE_COMPARISON.offers.map((offer) => (
                  <div
                    key={offer.agent}
                    className="rounded-lg border border-line bg-surface-0 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-strong">
                          {offer.agent}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          {offer.fee} · {offer.timeline}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        {offer.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="public-section bg-surface-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="max-w-2xl space-y-3">
              <p className="public-kicker">Seller access</p>
              <h2>Seller access stays selective so quality stays high.</h2>
              <p className="text-sm text-text-muted sm:text-base">
                WHOMA stays centred on agent quality, profile depth, and
                clearer transaction visibility. {sellerAccessNote}
              </p>
            </div>
            <Link
              href={PUBLIC_COLLABORATION_PILOT_HREF}
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              Request seller access
            </Link>
          </div>
        </section>

        <section className="public-section border-t border-line bg-surface-1">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="max-w-2xl space-y-3">
              <p className="public-kicker">Support</p>
              <h2>Questions about profiles, access, or collaboration?</h2>
              <p className="text-sm text-text-muted sm:text-base">
                Email {site.supportEmail} and we&apos;ll point you in the right
                direction. Typical response window:{" "}
                {site.supportResponseWindow.toLowerCase()}.
              </p>
            </div>
            <a
              href={getSupportMailto(site.supportEmail)}
              className={cn(buttonVariants({ variant: "primary" }))}
            >
              Contact support
            </a>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
