import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { MapPin } from "@phosphor-icons/react";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { buttonVariants } from "@/components/ui/button";
import {
  buildSupabaseAuthCallbackPath,
  hasSupabaseAuthReturnParams
} from "@/lib/auth/callback-return";
import { getHomepageFaqPreview } from "@/lib/faqs";
import {
  getPublicSiteConfig,
  getSupportMailto,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF,
  PUBLIC_FAQS_HREF
} from "@/lib/public-site";
import {
  PUBLIC_AGENT_PROOF_LOOP,
  PUBLIC_COLLABORATION_FLOW,
  PUBLIC_EXAMPLE_AGENT_PROFILES,
  PUBLIC_EXAMPLE_TRANSACTION_HISTORIES,
  PUBLIC_PHASE_SEQUENCE,
  PUBLIC_PROOF_MODULES,
  PUBLIC_SAMPLE_COMPARISON,
  PUBLIC_SAMPLE_PROFILE_VIEW,
  PUBLIC_WHY_AGENTS_JOIN
} from "@/lib/public-proof";
// Replace mockAgents with a Supabase query once real profiles are live:
// const agents = await supabase.from('profiles').select('*')
//   .eq('role', 'agent').eq('is_published', true).limit(4)
import { mockAgents } from "@/data/mockAgents";
import { cn } from "@/lib/utils";
import { listPublicAgentProfiles } from "@/server/agent-profile/service";
import {
  getLiveInstructionCards,
  getLiveInstructionLocationSummaries
} from "@/server/marketplace/queries";
import { getPhase1ValidationSnapshot } from "@/server/phase1-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LandingPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LandingPage({
  searchParams
}: LandingPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (hasSupabaseAuthReturnParams(resolvedSearchParams)) {
    redirect(
      buildSupabaseAuthCallbackPath(
        resolvedSearchParams ?? {}
      ) as Parameters<typeof redirect>[0]
    );
  }

  const site = getPublicSiteConfig();

  let publicAgents = [] as Awaited<ReturnType<typeof listPublicAgentProfiles>>;
  let liveInstructions = [] as Awaited<
    ReturnType<typeof getLiveInstructionCards>
  >;
  let hasAuthenticatedSession = false;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    hasAuthenticatedSession = Boolean(session);
  } catch {
    hasAuthenticatedSession = false;
  }

  const phase1Dashboard = hasAuthenticatedSession
    ? await getPhase1ValidationSnapshot()
    : null;

  if (process.env.DATABASE_URL) {
    [publicAgents, liveInstructions] = await Promise.all([
      listPublicAgentProfiles({ limit: 100 }),
      getLiveInstructionCards()
    ]);
  }

  const featuredAgent = publicAgents[0] ?? null;
  const isLiveFeaturedProfile = Boolean(featuredAgent);
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
    : {
        name: "A. Morgan",
        role: "Independent estate agent",
        agency: "North Row Estates",
        serviceAreas: ["London", "SW1A", "SE1"],
        specialties: ["Chain progression", "Family homes", "Viewings"],
        profileCompleteness: 92,
        yearsExperience: 11,
        publishedAt: null,
        image: null,
        href: PUBLIC_AGENT_CTA_HREF as Route
      };

  const sellerAccessNote =
    locationSummaries.length > 0
      ? `Seller access is currently visible in ${locationSummaries.length} ${
          locationSummaries.length === 1 ? "area" : "areas"
        }.`
      : "Seller access opens carefully as matching supply and moderation come into place.";
  const homepageFaqPreview = getHomepageFaqPreview();
  const phase1AsOf = phase1Dashboard
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/London"
      }).format(phase1Dashboard.generatedAt)
    : null;
  const qualifiedAgentDensityValue =
    phase1Dashboard?.objectives.find(
      (objective) => objective.key === "qualifiedAgentDensity"
    )?.current ?? 0;

  const featuredProfileFacts = [
    {
      label: "Service areas",
      value: featuredProof.serviceAreas.slice(0, 3).join(", ")
    },
    {
      label: "Specialties",
      value: featuredProof.specialties.slice(0, 3).join(", ")
    },
    {
      label: "Verification",
      value: isLiveFeaturedProfile ? "Verified by WHOMA" : "Sample completed profile"
    },
    {
      label: "Experience",
      value:
        featuredProof.yearsExperience !== null &&
        featuredProof.yearsExperience !== undefined
          ? `${featuredProof.yearsExperience} years`
          : "Self-reported"
    },
    {
      label: "Profile readiness",
      value: `${featuredProof.profileCompleteness}% complete`
    }
  ] as const;

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />

      <main>
        <section className="public-section border-b border-line bg-surface-1">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
            <div className="max-w-2xl space-y-6">
              <p className="public-kicker">For independent estate agents</p>
              <div className="space-y-4">
                <h1 className="max-w-3xl">
                  Where Home Owners Meet Agents.
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
                    {featuredProof.name}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {featuredProof.role} · {featuredProof.agency}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface-1 text-sm font-semibold text-text-strong">
                  {featuredProof.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featuredProof.image}
                      alt={featuredProof.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    featuredProof.name
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
                {isLiveFeaturedProfile
                  ? "This is a live production-verified public profile with a visible proof ledger."
                  : `No live verified profile is public yet. This illustrative profile stays visible while the first verified profile clears publication checks (current verified count: ${qualifiedAgentDensityValue}).`}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-line bg-surface-0 py-12">
          <div className="mx-auto w-full max-w-7xl space-y-7 px-4 sm:px-6 lg:px-8">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                WHOMA AGENTS
              </p>
              <h2 className="text-2xl font-semibold text-zinc-900">
                Independent agents. Verified records.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {mockAgents.map((agent, index) => (
                <article
                  key={agent.name}
                  className="rounded-2xl border border-slate-100 bg-white p-6 opacity-0 animate-[meet-agent-fade-up_550ms_ease-out_forwards]"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-zinc-900">
                          {agent.name}
                        </p>
                        <p className="inline-flex items-center gap-1 text-xs text-zinc-400">
                          <MapPin size={12} weight="regular" />
                          <span>{agent.location}</span>
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-600">
                      {agent.speciality}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex rounded-full bg-[#2d6a5a]/10 px-2.5 py-1 text-xs font-medium text-[#2d6a5a]">
                        {agent.dealsVerified} verified deals
                      </span>
                      <span className="text-xs text-zinc-400">
                        {agent.yearsActive} years active
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p className="text-xs text-zinc-400">
              Profile examples shown for illustration. Real agent profiles coming soon.
            </p>
          </div>
        </section>

        <section className="border-b border-line bg-surface-0 py-10">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="space-y-2">
              <p className="public-kicker">Proof infrastructure</p>
              <p className="max-w-4xl text-sm text-text-muted sm:text-base">
                WHOMA sequence: structured proof logging first, verified
                milestones second, and selective collaboration routes after
                proof.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {PUBLIC_PHASE_SEQUENCE.map((step) => (
                <div
                  key={step.title}
                  className="rounded-md border border-line bg-surface-1 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-text-strong">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <style jsx>{`
          @keyframes meet-agent-fade-up {
            from {
              opacity: 0;
              transform: translateY(10px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {/* Internal only — unhide when metrics are ready for public display */}
        {phase1Dashboard ? (
          <section className="border-b border-line bg-surface-1 py-10">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
              <div className="space-y-2">
                <p className="public-kicker">Phase 1 validation dashboard</p>
                <h2>Live behavioural proof dashboard.</h2>
                <p className="max-w-4xl text-sm text-text-muted sm:text-base">
                  WHOMA reports production-backed Phase 1 signals: qualified
                  density, transaction logging, collaboration participation, and
                  engagement cadence. Each objective reflects either logged
                  signals or verified milestones from durable event records.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {phase1Dashboard.objectives.map((objective) => (
                  <div
                    key={objective.key}
                    className="rounded-md border border-line bg-surface-0 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {objective.windowLabel}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {objective.status}
                      </p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-text-strong">
                      {objective.title}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {objective.description}
                    </p>
                    <p className="mt-3 text-sm font-medium text-text-strong">
                      {objective.current} / {objective.target} target
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-text-muted">
                Derived from production profile state and durable product
                events. Entries are logged signals unless explicitly marked as
                verified milestones. As of {phase1AsOf}.
              </p>
            </div>
          </section>
        ) : null}

        <section className="border-b border-line bg-surface-0 py-10">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="space-y-2">
              <p className="public-kicker">Public proof checklist</p>
              <h2>How proof is created from draft to live identity.</h2>
              <p className="max-w-4xl text-sm text-text-muted sm:text-base">
                This is the visible proof loop for agents and partners: upload,
                logging, evidence checks, engagement thresholds, then a
                shareable WHOMA identity.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-line bg-surface-1 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Logged signal
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  A structured event captured with source and timestamp
                  metadata.
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface-1 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Verified milestone
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  A completed check that has passed verification controls.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {PUBLIC_AGENT_PROOF_LOOP.map((step) => (
                <div
                  key={step.title}
                  className="rounded-md border border-line bg-surface-1 px-4 py-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {step.status}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-strong">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="public-section bg-surface-0">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <p className="public-kicker">Platform</p>
              <h2>WHOMA is verification and proof-ledger infrastructure for estate agents.</h2>
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
                <h2>A public profile should read like a live proof record.</h2>
                <p className="max-w-2xl text-sm text-text-muted sm:text-base">
                  WHOMA brings identity, profile depth, and collaboration
                  readiness into one page that can be shared with confidence.
                </p>
              </div>

              <div className="public-record space-y-4">
                <div className="public-divider" />
                <p className="text-sm leading-7 text-text-base">
                {isLiveFeaturedProfile
                  ? "This live profile is public because it has been published and verified by WHOMA."
                  : "This sample switches to a live profile once the first production-verified agent is public."}
              </p>
                <Link
                  href={featuredProof.href}
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  {isLiveFeaturedProfile ? "View this profile" : "Build your verified profile"}
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

        <section className="public-section border-y border-line bg-surface-1">
          <div className="mx-auto w-full max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
            <div className="space-y-3">
              <p className="public-kicker">Proof snapshots</p>
              <h2>Profile benchmark and proof-ledger snapshots.</h2>
              <p className="max-w-3xl text-sm text-text-muted sm:text-base">
                These examples show target quality only. Live trust comes from
                production event logs and verified milestones on real public
                profiles.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PUBLIC_EXAMPLE_AGENT_PROFILES.map((profile) => (
                <div
                  key={`${profile.name}-${profile.agency}`}
                  className="rounded-md border border-line bg-surface-0 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-text-strong">
                    {profile.name}
                  </p>
                  <p className="text-sm text-text-muted">{profile.agency}</p>
                  <p className="mt-2 text-sm text-text-muted">
                    Areas: {profile.areas}
                  </p>
                  <p className="text-sm text-text-muted">
                    Specialties: {profile.specialties}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-muted">
                    {profile.verification} · {profile.readiness} readiness
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {PUBLIC_EXAMPLE_TRANSACTION_HISTORIES.map((item) => (
                <div
                  key={item.agent}
                  className="rounded-md border border-line bg-surface-0 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-text-strong">
                    {item.agent}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">{item.summary}</p>
                  <ul className="mt-3 space-y-1 text-sm text-text-muted">
                    {item.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              ))}
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

        {site.showPhase2Preview ? (
        <section className="public-section border-y border-line bg-surface-1">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="space-y-3">
              <p className="public-kicker">{PUBLIC_COLLABORATION_FLOW.eyebrow}</p>
              <h2>{PUBLIC_COLLABORATION_FLOW.title}</h2>
              <p className="max-w-4xl text-sm text-text-muted sm:text-base">
                {PUBLIC_COLLABORATION_FLOW.summary}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {PUBLIC_COLLABORATION_FLOW.steps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-md border border-line bg-surface-0 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-text-strong">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            <details className="rounded-md border border-dashed border-line bg-surface-0 px-4 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-text-strong">
                View illustrative shortlist preview
              </summary>
              <div className="mt-3">
                <p className="public-kicker">{PUBLIC_SAMPLE_COMPARISON.eyebrow}</p>
                <p className="mt-1 text-sm font-semibold text-text-strong">
                  {PUBLIC_SAMPLE_COMPARISON.title}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {PUBLIC_SAMPLE_COMPARISON.summary}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {PUBLIC_SAMPLE_COMPARISON.offers.map((offer) => (
                    <div
                      key={offer.agent}
                      className="rounded-md border border-line bg-surface-1 px-3 py-3"
                    >
                      <p className="text-sm font-semibold text-text-strong">
                        {offer.agent}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {offer.summary} · {offer.timeline}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                        {offer.badge}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </section>
        ) : null}

        <section className="public-section bg-surface-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="max-w-2xl space-y-3">
              <p className="public-kicker">Seller access</p>
              <h2>Seller access stays selective so quality stays high.</h2>
              <p className="text-sm text-text-muted sm:text-base">
                WHOMA stays centred on agent quality, profile depth, and more
                verified proof infrastructure. {sellerAccessNote}
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

        <section className="border-y border-line bg-surface-1 py-12 sm:py-14">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            <div className="space-y-3">
              <p className="public-kicker">FAQs</p>
              <h2>Quick answers before you start.</h2>
              <p className="max-w-3xl text-sm text-text-muted sm:text-base">
                A short overview of what WHOMA is, how profile trust works, and
                how access is handled.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {homepageFaqPreview.map((item) => (
                <article
                  key={item.id}
                  className="rounded-md border border-line bg-surface-0 px-4 py-4"
                >
                  <h3 className="text-base">{item.question}</h3>
                  <p className="mt-2 text-sm text-text-muted">{item.answer}</p>
                </article>
              ))}
            </div>

            <Link
              href={PUBLIC_FAQS_HREF}
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              View all FAQs
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
                direction.
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
