import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPublicSiteConfig,
  getSupportMailto,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_AGENT_TRANSACTIONS_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF,
  PUBLIC_REQUESTS_PILOT_HREF
} from "@/lib/public-site";
import { cn } from "@/lib/utils";
import { listPublicAgentProfiles } from "@/server/agent-profile/service";
import {
  getLiveInstructionCards,
  getLiveInstructionLocationSummaries
} from "@/server/marketplace/queries";

export const dynamic = "force-dynamic";

const trustStrip = [
  "Business work-email verification",
  "Agent-owned public reputation",
  "Structured proposal workflow",
  "Shortlist-gated collaboration"
] as const;

const proofBlocks = [
  {
    title: "Verified transaction identity",
    body: "WHOMA starts with the identity layer: verified work email, structured role context, and a clearer record of who is actually participating."
  },
  {
    title: "Agent-owned reputation",
    body: "The public profile is designed to travel with the individual agent, so credibility is not trapped inside agency branding alone."
  },
  {
    title: "Structured collaboration infrastructure",
    body: "Requests, proposals, shortlist decisions, and messaging are structured so the next layer of proof comes from behaviour, not just claims."
  }
] as const;

const sampleCaseStudy = {
  label: "Sample pilot case study",
  title:
    "A London instruction moves from verification to shortlist in one controlled loop.",
  summary:
    "This is the kind of behaviour WHOMA is validating before any broader public launch: identity checked first, structured responses second, collaboration unlocked only after a shortlist signal.",
  metrics: [
    "2-bed flat in SW1A",
    "24-hour response window",
    "3 structured proposals submitted",
    "2 shortlisted before award"
  ],
  timeline: [
    "Agent publishes a verified profile with service areas, specialties, and response expectations.",
    "Homeowner instruction opens for a time-boxed response window with structured submission requirements.",
    "Structured proposals are compared side by side before one shortlist opens the collaboration thread."
  ]
} as const;

const fallbackFeaturedAgent = {
  name: "Featured verified profile",
  role: "Pilot example",
  agency: "Structured proof before scale",
  serviceAreas: ["London", "SW1A", "W1"],
  specialties: ["Local pricing", "Accompanied viewings", "Chain management"],
  profileCompleteness: 92,
  href: PUBLIC_AGENT_CTA_HREF
} as const;

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
  const submittedResponses = liveInstructions.reduce(
    (sum, instruction) => sum + instruction.proposalsCount,
    0
  );
  const proofStats = [
    {
      label: "Verified public profiles",
      value: publicAgents.length.toString()
    },
    {
      label: "Live pilot areas",
      value: locationSummaries.length.toString()
    },
    {
      label: "Open pilot requests",
      value: liveInstructions.length.toString()
    },
    {
      label: "Structured responses",
      value: submittedResponses.toString()
    }
  ];

  const featuredProof = featuredAgent
    ? {
        name: featuredAgent.user.name ?? "Estate agent",
        role: featuredAgent.jobTitle ?? "Estate agent",
        agency: featuredAgent.agencyName ?? "Independent",
        serviceAreas: featuredAgent.serviceAreas,
        specialties: featuredAgent.specialties,
        profileCompleteness: featuredAgent.profileCompleteness,
        href: featuredAgent.profileSlug
          ? (`/agents/${featuredAgent.profileSlug}` as Route)
          : PUBLIC_AGENT_DIRECTORY_HREF
      }
    : fallbackFeaturedAgent;

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />

          <nav className="hidden items-center gap-4 text-sm text-text-muted lg:flex">
            <Link
              href="/#what-whoma-is"
              className="transition-colors hover:text-brand-ink"
            >
              What it is
            </Link>
            <Link
              href="/#pilot-proof"
              className="transition-colors hover:text-brand-ink"
            >
              Pilot proof
            </Link>
            <Link
              href="/#interaction-demo"
              className="transition-colors hover:text-brand-ink"
            >
              Flow demo
            </Link>
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className="transition-colors hover:text-brand-ink"
            >
              Verified agents
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
        <section className="border-b border-line bg-surface-0">
          <div className="motif-grid mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-20">
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  {site.betaStatusLabel}
                </p>
                <h1 className="max-w-3xl text-4xl sm:text-5xl">
                  Identity and reputation infrastructure for estate agents.
                </h1>
                <p className="max-w-2xl text-base text-text-muted sm:text-lg">
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
                  Build your verified profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={PUBLIC_AGENT_TRANSACTIONS_HREF}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" })
                  )}
                >
                  Log your first transactions
                </Link>
                <Link
                  href={PUBLIC_COLLABORATION_PILOT_HREF}
                  className={cn(
                    buttonVariants({ variant: "tertiary", size: "lg" })
                  )}
                >
                  Join collaboration pilot
                </Link>
              </div>

              <ul
                className="grid gap-2 text-sm text-text-muted sm:grid-cols-2"
                aria-label="Pilot trust markers"
              >
                {trustStrip.map((item) => (
                  <li
                    key={item}
                    className="rounded-md border border-line bg-surface-0 px-3 py-2 shadow-soft"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-sm text-text-muted">
                Homeowner collaboration remains available only as a limited
                pilot.{" "}
                <Link
                  href={PUBLIC_REQUESTS_PILOT_HREF}
                  className="font-medium text-brand-ink underline"
                >
                  Explore limited pilot request areas
                </Link>
                .
              </p>
            </div>

            <Card className="border-line bg-surface-0 shadow-lift">
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Pilot snapshot
                  </p>
                  <h2 className="text-xl">
                    Operational proof already visible in the current rollout
                  </h2>
                  <p className="text-sm text-text-muted">
                    Public proof stays narrow on purpose: verified profiles
                    first, structured collaboration second, broader launch
                    later.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {proofStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-md border border-line bg-surface-1 px-3 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-text-strong">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-line bg-surface-1 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Support route
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {site.companyLegalName} is running this{" "}
                    {site.betaStatusLabel.toLowerCase()} for the{" "}
                    {site.operatingRegion}. Support and pilot access are
                    coordinated through{" "}
                    <a
                      href={getSupportMailto(site.supportEmail)}
                      className="font-medium text-brand-ink underline"
                    >
                      {site.supportEmail}
                    </a>{" "}
                    with a typical response window of{" "}
                    {site.supportResponseWindow.toLowerCase()}.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section
          id="what-whoma-is"
          className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mb-8 max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              What WHOMA is
            </p>
            <h2>
              Not a generic lead-gen portal. A controlled proof layer for
              identity, reputation, and collaboration.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {proofBlocks.map((item) => (
              <Card key={item.title} className="interactive-lift space-y-2">
                <h3 className="text-base">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="pilot-proof" className="border-y border-line bg-surface-0">
          <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <Card className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Featured agent proof
                </p>
                <h2 className="text-2xl">
                  A verified profile is meant to carry the agent, not just the
                  agency.
                </h2>
              </div>

              <div className="rounded-lg border border-line bg-surface-1 p-4">
                <p className="text-sm font-semibold text-text-strong">
                  {featuredProof.name}
                </p>
                <p className="text-sm text-text-muted">
                  {featuredProof.role} · {featuredProof.agency}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      Areas
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {featuredProof.serviceAreas.slice(0, 3).join(", ") ||
                        "Being configured"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      Specialties
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {featuredProof.specialties.slice(0, 3).join(", ") ||
                        "Structured profile depth"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      Profile readiness
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {featuredProof.profileCompleteness}% complete
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      Public gate
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Work email verified, publish ready, admin reviewed
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={featuredProof.href as Route}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                {featuredAgent
                  ? "View featured verified profile"
                  : "Build your verified profile"}
              </Link>
            </Card>

            <Card className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  {sampleCaseStudy.label}
                </p>
                <h2 className="text-2xl">{sampleCaseStudy.title}</h2>
                <p className="text-sm text-text-muted">
                  {sampleCaseStudy.summary}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {sampleCaseStudy.metrics.map((metric) => (
                  <div
                    key={metric}
                    className="rounded-md border border-line bg-surface-1 px-3 py-3 text-sm text-text-muted"
                  >
                    {metric}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {sampleCaseStudy.timeline.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-md border border-line bg-surface-1 px-3 py-3"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm text-text-muted">{item}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section
          id="interaction-demo"
          className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
        >
          <div className="mb-8 max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              Workflow demo
            </p>
            <h2>
              Meaningful collaboration only opens after structured proof exists.
            </h2>
            <p className="text-sm text-text-muted sm:text-base">
              This preview shows the interaction WHOMA is designed to make
              legible: a verified agent, a structured proposal, a shortlist
              signal, then an unlocked collaboration thread.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface-0 p-5 shadow-lift sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Interaction preview
                </p>
                <h3 className="text-lg font-semibold text-text-strong">
                  Instruction → structured proposals → shortlist → messaging
                </h3>
              </div>
              <span className="rounded-full border border-line bg-surface-1 px-3 py-1 text-xs font-medium text-text-muted">
                Controlled pilot flow
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr_0.8fr]">
              <div className="rounded-xl border border-line bg-surface-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Step 1
                </p>
                <h4 className="mt-2 text-base font-semibold text-text-strong">
                  Seller brief goes live
                </h4>
                <p className="mt-1 text-sm text-text-muted">
                  London flat · 24-hour response window · accompanied viewings
                  required
                </p>
                <ul className="mt-4 space-y-2 text-sm text-text-muted">
                  <li className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    Must-have: accompanied viewings
                  </li>
                  <li className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    Timeline goal: ASAP
                  </li>
                  <li className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    Status: LIVE
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-line bg-surface-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      Step 2
                    </p>
                    <h4 className="mt-2 text-base font-semibold text-text-strong">
                      Proposals stay comparable
                    </h4>
                  </div>
                  <span className="bg-brand-accent/10 rounded-full px-3 py-1 text-xs font-medium text-brand-ink">
                    3 structured responses
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ["Agent A", "1.1% fee · 21 days", "Shortlisted"],
                    ["Agent B", "£2,250 fixed · 28 days", "Best local fit"],
                    ["Agent C", "Hybrid fee · 30 days", "Under review"]
                  ].map(([name, detail, status]) => (
                    <div
                      key={name}
                      className="rounded-md border border-line bg-surface-0 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-text-strong">
                          {name}
                        </p>
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                          {status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-muted">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Step 3
                </p>
                <h4 className="mt-2 text-base font-semibold text-text-strong">
                  Shortlist unlocks collaboration
                </h4>
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-line bg-surface-0 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Thread state
                    </p>
                    <p className="mt-1 text-sm text-text-strong">
                      LOCKED → OPEN
                    </p>
                  </div>
                  <div className="rounded-md border border-line bg-surface-0 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      First useful message
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      “Can you confirm weekend viewing availability and your
                      pricing recommendation?”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Limited collaboration pilot
              </p>
              <h2 className="text-2xl">
                Homeowner demand capture stays tightly controlled while the
                proof layer matures.
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-muted sm:text-base">
                Public homeowner collaboration is not the lead story at this
                stage. Pilot access is coordinated manually so the identity and
                reputation layer can stay clear and trustworthy.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={PUBLIC_COLLABORATION_PILOT_HREF}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                Join collaboration pilot
              </Link>
              <a
                href={getSupportMailto(site.supportEmail)}
                className={cn(buttonVariants({ variant: "tertiary" }))}
              >
                Contact pilot team
              </a>
            </div>
          </div>
        </section>

        <section className="bg-surface-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <h2 className="text-2xl">
                Ready to build your verified WHOMA profile?
              </h2>
              <p className="mt-1 text-sm text-text-muted sm:text-base">
                Start with business email verification, publish your structured
                profile, then bring real collaboration proof into the record.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                Build your verified profile
              </Link>
              <Link
                href={PUBLIC_AGENT_TRANSACTIONS_HREF}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                Log your first transactions
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
