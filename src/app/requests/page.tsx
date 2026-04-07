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
  title: "WHOMA | Open instructions",
  description:
    "Area summaries for invited seller access on WHOMA.",
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
              Create your profile
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Seller access
          </p>
          <h1>Seller access opens selectively.</h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            WHOMA is built around verified agent profiles. This page simply
            shows where invited instructions are currently visible once seller
            access is in place.
          </p>
        </section>

        <Card className="space-y-3 bg-surface-0">
          <p className="text-sm text-text-muted">
            Start with verified agent profiles, then use these area summaries as
            supporting context once seller access is approved.
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
              href={PUBLIC_COLLABORATION_PILOT_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Request seller access
            </Link>
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.length === 0 ? (
            <Card className="border-dashed bg-surface-0 sm:col-span-2 lg:col-span-3">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-text-strong">
                  No open instructions are visible right now
                </h2>
                <p className="text-sm text-text-muted">
                  New instructions appear here only when seller access is open
                  and moderation is in place.
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
                    href={PUBLIC_COLLABORATION_PILOT_HREF}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "sm" })
                    )}
                  >
                    Request seller access
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
                    {location.instructionsCount} open instruction
                    {location.instructionsCount === 1 ? "" : "s"}
                  </p>
                  <p>{location.totalProposalsCount} offers submitted</p>
                </div>
                <Link
                  href={`/requests/${location.postcodeDistrict}` as Route}
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  View area overview
                </Link>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl">Current visible instructions</h2>
              <p className="text-sm text-text-muted">
                A selective view of invited seller access currently visible on
                WHOMA.
              </p>
            </div>
            <Link
              href={PUBLIC_COLLABORATION_PILOT_HREF}
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              Request seller access
            </Link>
          </div>

          {instructions.length === 0 ? (
            <Card className="border-dashed bg-surface-0">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-text-strong">
                  No open instructions are visible right now
                </h3>
                <p className="text-sm text-text-muted">
                  New instructions appear here only when seller access is open
                  and moderation is in place.
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
                  Request seller access
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {instructions.map((instruction) => (
                <InstructionCard
                  key={instruction.id}
                  instruction={instruction}
                  mode="public"
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
