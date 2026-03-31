import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_REQUESTS_PILOT_HREF
} from "@/lib/public-site";
import { cn } from "@/lib/utils";

const trustStrip = [
  "Business work-email verification",
  "Structured public profile",
  "Admin-reviewed trust badge",
  "Controlled pilot visibility"
] as const;

const activationPath = [
  {
    title: "Verify your business inbox",
    body: "Confirm your work email before onboarding is marked complete."
  },
  {
    title: "Build your WHOMA baseline",
    body: "Capture agency, service areas, specialties, and a structured professional summary."
  },
  {
    title: "Reach publish readiness",
    body: "Add enough detail to cross the 70% completeness threshold."
  },
  {
    title: "Publish and pass review",
    body: "Admin verification unlocks directory visibility and the public trust badge."
  }
] as const;

const proofBlocks = [
  {
    title: "Verified professional identity",
    body: "WHOMA starts with a business email check and structured profile proof before broader marketplace expansion."
  },
  {
    title: "Portable professional credibility",
    body: "Profiles are designed to help agents show individual strengths beyond agency brand alone."
  },
  {
    title: "Controlled rollout discipline",
    body: "Homeowner tendering remains a pilot while we validate agent density, quality, and review mechanics."
  }
] as const;

const agentValue = [
  {
    title: "Create a profile you can share confidently",
    body: "Show service areas, specialties, experience, and structured credibility signals in one place."
  },
  {
    title: "Publish only when you are ready",
    body: "The activation checklist makes it obvious what still needs to happen before public visibility."
  },
  {
    title: "Earn public trust through verification",
    body: "Admin review is the gate that turns a draft profile into a publicly trusted WHOMA presence."
  }
] as const;

const phaseSequencing = [
  {
    title: "Identity first",
    body: "Verify the agent, publish the profile, and prove that professionals care about building reputation portability."
  },
  {
    title: "Pilot collaboration second",
    body: "Run controlled seller-request access as a secondary path while agent depth and review quality improve."
  },
  {
    title: "Structured tendering after proof",
    body: "Broader homeowner-led comparison becomes stronger once public evidence of agent quality already exists."
  }
] as const;

export default function LandingPage(): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />

          <nav className="hidden items-center gap-4 text-sm text-text-muted lg:flex">
            <Link href="/#how-it-works" className="transition-colors hover:text-brand-ink">
              How it works
            </Link>
            <Link href="/#for-agents" className="transition-colors hover:text-brand-ink">
              For agents
            </Link>
            <Link href="/#phase-sequencing" className="transition-colors hover:text-brand-ink">
              Phase 1
            </Link>
            <Link href={PUBLIC_AGENT_DIRECTORY_HREF} className="transition-colors hover:text-brand-ink">
              Verified agents
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/sign-in" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              Sign in
            </Link>
            <Link href={PUBLIC_AGENT_CTA_HREF} className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              Build your profile
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
                  Build a verified estate agent profile people can trust.
                </h1>
                <p className="max-w-2xl text-base text-text-muted sm:text-lg">
                  WHOMA is validating verified estate agent identity first: business work-email verification,
                  structured public profiles, and admin-reviewed trust before broader marketplace expansion.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={PUBLIC_AGENT_CTA_HREF} className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                  Build your verified profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={PUBLIC_AGENT_DIRECTORY_HREF}
                  className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                >
                  Browse verified agents
                </Link>
              </div>

              <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2" aria-label="Phase 1 trust markers">
                {trustStrip.map((item) => (
                  <li key={item} className="rounded-md border border-line bg-surface-0 px-3 py-2 shadow-soft">
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-sm text-text-muted">
                Homeowner tendering remains available as a controlled pilot.{" "}
                <Link href={PUBLIC_REQUESTS_PILOT_HREF} className="font-medium text-brand-ink underline">
                  View pilot request areas
                </Link>
                .
              </p>
            </div>

            <Card className="border-line bg-surface-0 shadow-lift">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Activation path
                  </p>
                  <h2 className="text-xl">The Phase 1 proof loop WHOMA is validating</h2>
                </div>

                <div className="space-y-3">
                  {activationPath.map((item, index) => (
                    <div
                      key={item.title}
                      className="rounded-md border border-line bg-surface-1 px-3 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-1 text-base">{item.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">How it works</p>
            <h2>Verified identity first. Public visibility after proof.</h2>
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

        <section id="for-agents" className="border-y border-line bg-surface-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">For agents</p>
              <h2>Use WHOMA to make your professional credibility legible.</h2>
              <p className="text-sm text-text-muted sm:text-base">
                The current product goal is simple: prove that serious estate agents will verify their identity, complete
                a structured profile, publish it, and care about earning visible trust.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {agentValue.map((item) => (
                <Card key={item.title} className="interactive-lift space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
                    <h3 className="text-base">{item.title}</h3>
                  </div>
                  <p className="text-sm text-text-muted">{item.body}</p>
                </Card>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={PUBLIC_AGENT_CTA_HREF} className={cn(buttonVariants({ variant: "primary" }))}>
                Start agent onboarding
              </Link>
              <Link
                href={PUBLIC_AGENT_DIRECTORY_HREF}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                See verified profile examples
              </Link>
            </div>
          </div>
        </section>

        <section id="phase-sequencing" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Phase 1 sequencing</p>
            <h2>WHOMA is deliberately validating one thing at a time.</h2>
            <p className="text-sm text-text-muted sm:text-base">
              The public story matches the current operating thesis: identity depth first, collaboration liquidity next,
              broader structured tendering after proof.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {phaseSequencing.map((item) => (
              <Card key={item.title} className="interactive-lift space-y-2">
                <h3 className="text-base">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-surface-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Controlled homeowner pilot</p>
              <h2 className="text-2xl">Homeowner tendering is live only as a secondary pilot path.</h2>
              <p className="mt-1 max-w-2xl text-sm text-text-muted sm:text-base">
                Request browse pages remain available for controlled rollout, but WHOMA is not positioning itself as a
                broad public comparison portal yet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={PUBLIC_REQUESTS_PILOT_HREF} className={cn(buttonVariants({ variant: "secondary" }))}>
                Explore pilot request areas
              </Link>
              <Link href={`mailto:${site.supportEmail}`} className={cn(buttonVariants({ variant: "tertiary" }))}>
                Contact pilot team
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-surface-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <h2 className="text-2xl">Ready to build your verified WHOMA profile?</h2>
              <p className="mt-1 text-sm text-text-muted sm:text-base">
                Start with business email verification, complete your structured profile, and work toward public trust.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={PUBLIC_AGENT_CTA_HREF} className={cn(buttonVariants({ variant: "primary" }))}>
                Build your profile
              </Link>
              <Link href={PUBLIC_AGENT_DIRECTORY_HREF} className={cn(buttonVariants({ variant: "secondary" }))}>
                Browse verified agents
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
