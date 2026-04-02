import Link from "next/link";
import type { Metadata, Route } from "next";
import type { ReactElement } from "react";

import { Logo } from "@/components/brand/logo";
import { InstructionCard } from "@/components/instruction-card";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF
} from "@/lib/public-site";
import { PUBLIC_SAMPLE_COMPARISON } from "@/lib/public-proof";
import {
  getLiveInstructionCards,
  getLiveInstructionLocationSummaries
} from "@/server/marketplace/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WHOMA | Controlled homeowner collaboration pilot",
  description:
    "Secondary Phase 1 pilot surface for limited homeowner collaboration while WHOMA validates verified estate-agent identity first.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function LocationsIndexPage(): Promise<ReactElement> {
  const instructions = await getLiveInstructionCards();
  const locations = getLiveInstructionLocationSummaries(instructions);
  const site = getPublicSiteConfig();

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />
          <div className="flex items-center gap-2">
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" })
              )}
            >
              Verified agents
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

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Controlled homeowner pilot
          </p>
          <h1>Homeowner collaboration remains a secondary Phase 1 pilot.</h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            These pages stay live for controlled testing, but WHOMA&apos;s
            public lead story remains verified estate agent identity, profile
            quality, and admin-reviewed trust.
          </p>
        </section>

        <Card className="space-y-3 bg-surface-0">
          <p className="text-sm text-text-muted">
            If you are evaluating WHOMA publicly, start with the verified agent
            directory. Use this request view only as supporting pilot evidence.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" })
              )}
            >
              Browse verified agents
            </Link>
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Build your verified profile
            </Link>
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.length === 0 ? (
            <Card className="border-dashed bg-surface-0 sm:col-span-2 lg:col-span-3">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-text-strong">
                  No pilot requests are live right now
                </h2>
                <p className="text-sm text-text-muted">
                  That is expected during the identity-first rollout. Homeowner
                  collaboration only opens when a brief, a structured response
                  window, and agent-side proof are all in place.
                </p>
                <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {PUBLIC_SAMPLE_COMPARISON.eyebrow}
                  </p>
                  <div className="mt-2 space-y-2">
                    {PUBLIC_SAMPLE_COMPARISON.offers
                      .slice(0, 2)
                      .map((offer) => (
                        <div
                          key={offer.agent}
                          className="rounded-md border border-line bg-surface-0 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-text-strong">
                              {offer.agent}
                            </p>
                            <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                              {offer.badge}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-text-muted">
                            {offer.fee} · {offer.timeline}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={PUBLIC_AGENT_CTA_HREF}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "sm" })
                    )}
                  >
                    Build your verified profile
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            locations.map((location) => (
              <Card
                key={location.postcodeDistrict}
                className="interactive-lift space-y-3"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {location.city}
                  </p>
                  <h2 className="mt-1 text-lg">{location.postcodeDistrict}</h2>
                </div>
                <div className="space-y-1 text-sm text-text-muted">
                  <p>
                    {location.instructionsCount} live pilot request
                    {location.instructionsCount === 1 ? "" : "s"}
                  </p>
                  <p>
                    {location.totalProposalsCount} agent responses submitted
                  </p>
                </div>
                <Link
                  href={`/requests/${location.postcodeDistrict}` as Route}
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  View pilot requests in {location.postcodeDistrict}
                </Link>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl">Live pilot requests</h2>
              <p className="text-sm text-text-muted">
                Secondary proof surface for controlled homeowner-access testing.
              </p>
            </div>
            <Link
              href={PUBLIC_COLLABORATION_PILOT_HREF}
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              Join collaboration pilot
            </Link>
          </div>

          {instructions.length === 0 ? (
            <Card className="border-dashed bg-surface-0">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-text-strong">
                  No open pilot requests to show yet
                </h3>
                <p className="text-sm text-text-muted">
                  WHOMA will widen this surface only after the verified-profile
                  pilot shows strong agent quality and the collaboration rules
                  continue to hold up.
                </p>
                <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {PUBLIC_SAMPLE_COMPARISON.eyebrow}
                  </p>
                  <div className="mt-2 space-y-2">
                    {PUBLIC_SAMPLE_COMPARISON.offers.map((offer) => (
                      <div
                        key={offer.agent}
                        className="rounded-md border border-line bg-surface-0 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-text-strong">
                            {offer.agent}
                          </p>
                          <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                            {offer.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-text-muted">
                          {offer.fee} · {offer.timeline}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href={PUBLIC_COLLABORATION_PILOT_HREF}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" })
                  )}
                >
                  Join collaboration pilot
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {instructions.map((instruction) => (
                <InstructionCard
                  key={instruction.id}
                  instruction={instruction}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
