import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { InstructionCard } from "@/components/instruction-card";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  getLiveInstructionsByDistrict,
  getLocationDistrictParams,
  normalizePostcodeDistrictKey
} from "@/lib/mock/live-instructions";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ postcodeDistrict: string }>;
}

export const dynamicParams = false;

export function generateStaticParams(): Array<{ postcodeDistrict: string }> {
  return getLocationDistrictParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postcodeDistrict } = await params;
  const normalizedDistrict = normalizePostcodeDistrictKey(postcodeDistrict);

  return {
    title: `WHOMA | LIVE Instructions in ${normalizedDistrict}`,
    description: `Browse Whoma LIVE Instructions for ${normalizedDistrict} and compare active seller briefs and bid windows.`
  };
}

export default async function LocationPage({ params }: PageProps): Promise<JSX.Element> {
  const { postcodeDistrict } = await params;
  const instructions = getLiveInstructionsByDistrict(postcodeDistrict);

  if (instructions.length === 0) {
    notFound();
  }

  const normalizedDistrict = normalizePostcodeDistrictKey(postcodeDistrict);
  const city = instructions[0]?.city ?? "UK";
  const totalProposals = instructions.reduce((sum, instruction) => sum + instruction.proposalsCount, 0);

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle="Where Home Owners Meet Agents" />
          <Link href="/locations" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            All locations
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Location feed</p>
          <h1>
            LIVE Instructions in {city} · {normalizedDistrict}
          </h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            Structured seller instructions currently open for agent proposals in this postcode district.
            Proposal submission remains gated behind sign-in.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="space-y-1 bg-surface-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Postcode district</p>
            <p className="text-lg font-semibold text-text-strong">{normalizedDistrict}</p>
          </Card>
          <Card className="space-y-1 bg-surface-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Live instructions</p>
            <p className="text-lg font-semibold text-text-strong">{instructions.length}</p>
          </Card>
          <Card className="space-y-1 bg-surface-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Proposals (demo)</p>
            <p className="text-lg font-semibold text-text-strong">{totalProposals}</p>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl">Instruction feed</h2>
            <Link href="/sign-up?role=AGENT" className={cn(buttonVariants({ variant: "primary" }))}>
              Join as an agent
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {instructions.map((instruction) => (
              <InstructionCard key={instruction.id} instruction={instruction} />
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
