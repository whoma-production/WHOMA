import Link from "next/link";
import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { InstructionCard } from "@/components/instruction-card";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  getLiveInstructionLocationSummaries,
  mockLiveInstructions
} from "@/lib/mock/live-instructions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "WHOMA | Browse LIVE Instructions by Location",
  description:
    "Browse Whoma LIVE Instructions by postcode district and city. Compare active seller briefs and bid windows, not property listings."
};

export default function LocationsIndexPage(): JSX.Element {
  const locations = getLiveInstructionLocationSummaries();

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle="Where Home Owners Meet Agents" />
          <div className="flex items-center gap-2">
            <Link href="/sitemap" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              Sitemap
            </Link>
            <Link href="/sign-in" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Locations</p>
          <h1>Browse LIVE Instructions by location</h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            Whoma lists active seller instructions by postcode district and city so agents can find relevant
            opportunities quickly. This is not a property-for-sale portal.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card key={location.postcodeDistrict} className="interactive-lift space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{location.city}</p>
                <h2 className="mt-1 text-lg">{location.postcodeDistrict}</h2>
              </div>
              <div className="space-y-1 text-sm text-text-muted">
                <p>
                  {location.instructionsCount} live instruction{location.instructionsCount === 1 ? "" : "s"}
                </p>
                <p>{location.totalProposalsCount} total proposals submitted (demo data)</p>
              </div>
              <Link href={`/locations/${location.postcodeDistrict}`} className={cn(buttonVariants({ variant: "secondary" }))}>
                View location feed
              </Link>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl">Current LIVE Instructions</h2>
              <p className="text-sm text-text-muted">Preview of active instruction cards shown in the agent marketplace.</p>
            </div>
            <Link href="/agent/marketplace" className={cn(buttonVariants({ variant: "secondary" }))}>
              Open agent marketplace
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {mockLiveInstructions.map((instruction) => (
              <InstructionCard key={instruction.id} instruction={instruction} />
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
