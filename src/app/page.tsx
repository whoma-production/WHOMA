import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Handshake,
  MapPinned,
  Receipt,
  ShieldCheck,
  Timer
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const howItWorksSteps = [
  {
    title: "Post one brief",
    description: "Share your property details and selling goals once, then open a 24-48h bid window.",
    icon: Timer
  },
  {
    title: "Receive structured offers",
    description: "Agents send standardised proposals so you can compare fees, scope and timelines like-for-like.",
    icon: FileCheck2
  },
  {
    title: "Choose with confidence",
    description: "Shortlist, award the instruction, and only then unlock chat to move the deal forward.",
    icon: ShieldCheck
  }
] as const;

const trustBullets = [
  "No obligation to award",
  "Comparable proposals (standardised)",
  "Chat gated until shortlist/award"
] as const;

const comparisonCards = [
  {
    title: "Fee model",
    description: "Fixed fee, %, hybrid or success bands.",
    icon: Receipt
  },
  {
    title: "Inclusions",
    description: "Photography, floorplan, viewings, progression support.",
    icon: CheckCircle2
  },
  {
    title: "Timeline estimate",
    description: "Expected timeline and delivery cadence.",
    icon: Clock3
  },
  {
    title: "Cancellation terms",
    description: "Notice periods and withdrawal terms upfront.",
    icon: Handshake
  },
  {
    title: "Local experience",
    description: "Service areas and fit for your postcode district.",
    icon: MapPinned
  },
  {
    title: "Verification status",
    description: "Trust badge shown where available.",
    icon: ShieldCheck
  }
] as const;

const roleSplit = {
  homeowners: [
    "Create one brief instead of repeating the same conversation to multiple agents.",
    "Compare offers side-by-side on price, scope and terms before speaking to anyone.",
    "Award only when you are ready, with no obligation to accept a proposal."
  ],
  agents: [
    "Compete on service and pricing with a structured proposal, not a rushed pitch call.",
    "See clear seller goals and timelines before deciding whether to submit.",
    "Chat opens after shortlist/award, keeping leads focused and qualified."
  ]
} as const;

export default function LandingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle="Where Home Owners Meet Agents" />
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              Sign in
            </Link>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-line bg-surface-0">
          <div className="motif-grid mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-20">
            <div className="space-y-6">
              <p className="animate-enter-up text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                UK home-selling marketplace
              </p>
              <h1 className="animate-enter-up animate-delay-1 max-w-2xl text-4xl sm:text-5xl">
                Sell your home with confidence: compare agent offers side-by-side.
              </h1>
              <p className="animate-enter-up animate-delay-2 max-w-2xl text-base text-text-muted sm:text-lg">
                Post your property brief once. Receive structured proposals in 24-48 hours. Compare fees,
                inclusions and timelines, then award the agent you trust.
              </p>
              <div className="animate-enter-up animate-delay-2 flex flex-wrap gap-3">
                <Link href="/sign-up?role=HOMEOWNER" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                  Create a homeowner brief
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/sign-up?role=AGENT" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
                  Join as an agent
                </Link>
              </div>
              <ul className="animate-enter-up animate-delay-3 grid gap-2 text-sm text-text-muted sm:grid-cols-3" aria-label="Trust highlights">
                {trustBullets.map((bullet) => (
                  <li key={bullet} className="rounded-md border border-line bg-surface-0 px-3 py-2 shadow-soft">
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <Card className="animate-enter-card animate-delay-2 interactive-lift relative border-line bg-surface-0 shadow-lift">
              <div className="infinity-watermark relative space-y-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">How Whoma works</p>
                  <h2 className="text-xl">Instruction → Bid Window → Proposals → Shortlist → Award</h2>
                  <p className="text-sm text-text-muted">
                    Keep control of the process while agents compete on a clear, comparable proposal format.
                  </p>
                </div>
                <ol className="space-y-3 text-sm">
                  <li className="rounded-md border border-line bg-surface-1 px-4 py-3">
                    1. Create your brief once and open a 24-48h bid window.
                  </li>
                  <li className="rounded-md border border-line bg-surface-1 px-4 py-3">
                    2. Receive structured proposals covering fees, inclusions, timelines and terms.
                  </li>
                  <li className="rounded-md border border-line bg-surface-1 px-4 py-3">
                    3. Shortlist and award the instruction before chat opens.
                  </li>
                </ol>
              </div>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">How it works</p>
              <h2 className="mt-2">A calmer way to choose the right agent and the right deal</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {howItWorksSteps.map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="interactive-lift space-y-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-accent/10 text-brand-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3>{step.title}</h3>
                    <p className="text-sm text-text-muted">{step.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="border-y border-line bg-surface-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">What you compare</p>
              <h2>Compare like-for-like before you commit</h2>
              <p className="text-sm text-text-muted sm:text-base">
                Whoma standardises the important parts of an agent proposal so you can make a decision quickly
                without digging through mismatched pitches.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {comparisonCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="interactive-lift space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-accent/10 text-brand-accent">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-base">{item.title}</h3>
                        <p className="mt-1 text-sm text-text-muted">{item.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Who Whoma is for</p>
            <h2>Built for clarity on both sides of the instruction</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="interactive-lift space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3>For Homeowners</h3>
                <span className="rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-ink">
                  Control + clarity
                </span>
              </div>
              <ul className="space-y-2 text-sm text-text-muted">
                {roleSplit.homeowners.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="interactive-lift space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3>For Agents</h3>
                <span className="rounded-full bg-surface-1 px-3 py-1 text-xs font-semibold text-text-strong">
                  Qualified opportunities
                </span>
              </div>
              <ul className="space-y-2 text-sm text-text-muted">
                {roleSplit.agents.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <section className="border-t border-line bg-surface-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Early access</p>
              <h2 className="mt-1 text-xl">Launching in the UK. Join early to shape the marketplace.</h2>
              <p className="mt-1 text-sm text-text-muted">
                We are focused on a lean MVP: clear proposals, fair comparison, and a calmer selling decision.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up?role=HOMEOWNER" className={cn(buttonVariants({ variant: "primary" }))}>
                Create a homeowner brief
              </Link>
              <Link href="/sign-up?role=AGENT" className={cn(buttonVariants({ variant: "secondary" }))}>
                Join as an agent
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
