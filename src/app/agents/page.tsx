import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listPublicAgentProfiles } from "@/server/agent-profile/service";

interface PageProps {
  searchParams?: Promise<{ area?: string; specialty?: string; verified?: string }>;
}

export default async function AgentDirectoryPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const serviceArea = resolvedSearchParams?.area?.trim() || undefined;
  const specialty = resolvedSearchParams?.specialty?.trim() || undefined;
  const verifiedOnly = resolvedSearchParams?.verified === "true";

  const agents = await listPublicAgentProfiles({
    ...(serviceArea ? { serviceArea } : {}),
    ...(specialty ? { specialty } : {}),
    ...(verifiedOnly ? { verifiedOnly: true } : {})
  });

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle="Where Home Owners Meet Real Estate Agents" />
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              Sign in
            </Link>
            <Link href="/sign-up?role=AGENT" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              Join as real estate agent
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">WHOMA Directory</p>
          <h1>Find verified real estate agents building personal credibility</h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            Explore public agent profiles with structured professional details, service areas, and verification status.
          </p>
        </div>

        <form className="mt-6 grid gap-3 rounded-md border border-line bg-surface-0 p-4 md:grid-cols-4">
          <label className="space-y-1 md:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Area</span>
            <Input name="area" defaultValue={serviceArea ?? ""} placeholder="SW1A" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Specialty</span>
            <Input name="specialty" defaultValue={specialty ?? ""} placeholder="Luxury homes" />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-text-muted">
            <input type="checkbox" name="verified" value="true" defaultChecked={verifiedOnly} className="h-4 w-4 rounded border-line" />
            Verified only
          </label>
          <div className="md:col-span-4">
            <button type="submit" className="rounded-md bg-brand-accent px-4 py-2 text-sm font-medium text-white">
              Apply filters
            </button>
          </div>
        </form>

        {agents.length === 0 ? (
          <Card className="mt-6">
            <h2 className="text-lg font-semibold text-text-strong">No public profiles match those filters yet</h2>
            <p className="mt-2 text-sm text-text-muted">Try removing filters or check back as more real estate agents publish profiles.</p>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.userId} className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{agent.verificationStatus}</p>
                  <h2 className="mt-1 text-lg font-semibold text-text-strong">{agent.user.name ?? "Real estate agent"}</h2>
                  <p className="text-sm text-text-muted">{agent.jobTitle ?? "Property sales specialist"}</p>
                </div>
                <div className="space-y-1 text-sm text-text-muted">
                  <p>Agency: {agent.agencyName ?? "Independent"}</p>
                  <p>Areas: {agent.serviceAreas.join(", ") || "Not listed"}</p>
                  <p>Specialties: {agent.specialties.join(", ") || "Not listed"}</p>
                </div>
                {agent.profileSlug ? (
                  <Link href={`/agents/${agent.profileSlug}`} className="text-sm font-medium text-brand-ink underline">
                    View full profile
                  </Link>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
