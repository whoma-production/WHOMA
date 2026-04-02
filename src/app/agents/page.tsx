import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_REQUESTS_PILOT_HREF
} from "@/lib/public-site";
import { cn } from "@/lib/utils";
import { listPublicAgentProfiles } from "@/server/agent-profile/service";

interface PageProps {
  searchParams?: Promise<{ area?: string; specialty?: string }>;
}

export default async function AgentDirectoryPage({
  searchParams
}: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const serviceArea = resolvedSearchParams?.area?.trim() || undefined;
  const specialty = resolvedSearchParams?.specialty?.trim() || undefined;
  const site = getPublicSiteConfig();

  const agents = await listPublicAgentProfiles({
    ...(serviceArea ? { serviceArea } : {}),
    ...(specialty ? { specialty } : {})
  });

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />
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

      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Verified agent directory
          </p>
          <h1>Browse admin-verified estate agent profiles on WHOMA.</h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            This directory only shows profiles that are both published and admin
            verified. It is the public proof layer for WHOMA&apos;s Phase 1
            identity pilot.
          </p>
        </div>

        <Card className="mt-6 space-y-3 bg-surface-0">
          <p className="text-sm text-text-muted">
            Looking for homeowner collaboration? It remains a secondary pilot
            path while WHOMA validates verified agent depth first.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Build your verified profile
            </Link>
            <Link
              href={PUBLIC_REQUESTS_PILOT_HREF}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" })
              )}
            >
              View pilot request areas
            </Link>
          </div>
        </Card>

        <form className="mt-6 grid gap-3 rounded-md border border-line bg-surface-0 p-4 md:grid-cols-3">
          <label className="space-y-1 md:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
              Service area
            </span>
            <Input
              name="area"
              defaultValue={serviceArea ?? ""}
              placeholder="SW1A"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
              Specialty
            </span>
            <Input
              name="specialty"
              defaultValue={specialty ?? ""}
              placeholder="Family homes"
            />
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-brand-accent px-4 py-2 text-sm font-medium text-white"
            >
              Apply filters
            </button>
          </div>
        </form>

        {agents.length === 0 ? (
          <Card className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">
              No verified pilot profiles match those filters yet
            </h2>
            <p className="text-sm text-text-muted">
              This directory only opens once a profile has passed work-email
              verification, reached publish readiness, and cleared admin review.
              Try a wider area search, or start your own profile to enter that
              rollout.
            </p>
            <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                Proof standard
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Public profiles on WHOMA expose service areas, specialties, and
                a verified trust state before they appear here.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" })
                )}
              >
                Build your verified profile
              </Link>
              <Link
                href="/agents"
                className="text-sm font-medium text-brand-ink underline"
              >
                Clear filters
              </Link>
            </div>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.userId} className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Verified profile
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-text-strong">
                    {agent.user.name ?? "Estate agent"}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {agent.jobTitle ?? "Property sales specialist"}
                  </p>
                </div>
                <div className="space-y-1 text-sm text-text-muted">
                  <p>Agency: {agent.agencyName ?? "Independent"}</p>
                  <p>Areas: {agent.serviceAreas.join(", ") || "Not listed"}</p>
                  <p>
                    Specialties: {agent.specialties.join(", ") || "Not listed"}
                  </p>
                  <p>Profile completeness: {agent.profileCompleteness}%</p>
                </div>
                {agent.profileSlug ? (
                  <Link
                    href={`/agents/${agent.profileSlug}`}
                    className="text-sm font-medium text-brand-ink underline"
                  >
                    View verified profile
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
