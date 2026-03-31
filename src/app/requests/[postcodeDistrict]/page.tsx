import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { Logo } from "@/components/brand/logo";
import { InstructionCard } from "@/components/instruction-card";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF
} from "@/lib/public-site";
import {
  getLiveInstructionCards,
  getLiveInstructionsByDistrict,
  normalizePostcodeDistrictKey
} from "@/server/marketplace/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ postcodeDistrict: string }>;
}

export async function generateStaticParams(): Promise<Array<{ postcodeDistrict: string }>> {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postcodeDistrict } = await params;
  const normalizedDistrict = normalizePostcodeDistrictKey(postcodeDistrict);

  return {
    title: `WHOMA | Pilot requests in ${normalizedDistrict}`,
    description: `Controlled Phase 1 pilot request visibility for ${normalizedDistrict}.`,
    robots: {
      index: false,
      follow: false
    }
  };
}

export default async function LocationPage({ params }: PageProps): Promise<ReactElement> {
  const { postcodeDistrict } = await params;
  const allInstructions = await getLiveInstructionCards();
  const instructions = getLiveInstructionsByDistrict(allInstructions, postcodeDistrict);
  const site = getPublicSiteConfig();

  const normalizedDistrict = normalizePostcodeDistrictKey(postcodeDistrict);
  const city = instructions[0]?.city ?? "UK";
  const totalOffers = instructions.reduce(
    (sum, instruction) => sum + instruction.proposalsCount,
    0
  );

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />
          <div className="flex items-center gap-2">
            <Link href="/requests" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              All pilot areas
            </Link>
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Build your profile
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Controlled homeowner pilot
          </p>
          <h1>
            Live pilot requests in {city} · {normalizedDistrict}
          </h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            This is a secondary request surface for controlled rollout. WHOMA&apos;s primary public proof remains the
            verified agent directory.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="space-y-1 bg-surface-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Area</p>
            <p className="text-lg font-semibold text-text-strong">{normalizedDistrict}</p>
          </Card>
          <Card className="space-y-1 bg-surface-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Open pilot requests</p>
            <p className="text-lg font-semibold text-text-strong">{instructions.length}</p>
          </Card>
          <Card className="space-y-1 bg-surface-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Responses submitted</p>
            <p className="text-lg font-semibold text-text-strong">{totalOffers}</p>
          </Card>
        </section>

        <Card className="space-y-3 bg-surface-0">
          <p className="text-sm text-text-muted">
            If you want the main Phase 1 story, go back to verified agent profiles. Use this page as pilot context only.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Browse verified agents
            </Link>
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Join the agent pilot
            </Link>
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl">Request feed</h2>
            <Link href="/agent/marketplace" className={cn(buttonVariants({ variant: "secondary" }))}>
              Open agent workspace
            </Link>
          </div>
          {instructions.length === 0 ? (
            <Card className="border-dashed bg-surface-0">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-text-strong">
                  No live pilot requests here right now
                </h3>
                <p className="text-sm text-text-muted">
                  That is normal while WHOMA keeps homeowner tendering controlled and identity-first.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {instructions.map((instruction) => (
                <InstructionCard key={instruction.id} instruction={instruction} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
