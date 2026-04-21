import Link from "next/link";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF
} from "@/lib/public-site";
import {
  PUBLIC_AGENT_PROOF_LOOP,
  PUBLIC_EXAMPLE_AGENT_PROFILES
} from "@/lib/public-proof";
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
  const hasSearchFilters = Boolean(serviceArea || specialty);

  const agents = await listPublicAgentProfiles({
    ...(serviceArea ? { serviceArea } : {}),
    ...(specialty ? { specialty } : {})
  });
  const fallbackFeaturedAgent =
    agents[0] ??
    (serviceArea || specialty
      ? ((await listPublicAgentProfiles({ limit: 1 }))[0] ?? null)
      : null);

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Verified profiles
          </p>
          <h1>Verified independent estate agents.</h1>
          <p className="max-w-3xl text-sm text-text-muted sm:text-base">
            Browse published WHOMA profiles by area and specialty, or create
            your own profile to build a stronger public presence.
          </p>
        </div>

        <Card className="mt-6 space-y-3 bg-surface-0">
          <p className="text-sm text-text-muted">
            Seller access is opened selectively so quality stays high. If you
            are preparing a sale, contact WHOMA and we will route you
            correctly.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Create your profile
            </Link>
            <Link
              href={PUBLIC_COLLABORATION_PILOT_HREF}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" })
              )}
            >
              Request seller access
            </Link>
          </div>
        </Card>

        <Card className="mt-6 space-y-4 bg-surface-0">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
              Example profile benchmarks
            </p>
            <p className="text-sm text-text-muted">
              We are publishing real verified profiles progressively. These
              examples show the expected profile quality standard.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PUBLIC_EXAMPLE_AGENT_PROFILES.map((profile) => (
              <div
                key={`${profile.name}-${profile.agency}`}
                className="rounded-md border border-line bg-surface-1 px-3 py-3"
              >
                <p className="text-sm font-medium text-text-strong">
                  {profile.name}
                </p>
                <p className="text-sm text-text-muted">{profile.agency}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {profile.areas} · {profile.specialties}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                  {profile.verification} · {profile.readiness} readiness
                </p>
              </div>
            ))}
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
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Search profiles
            </button>
          </div>
        </form>

        {agents.length === 0 ? (
          <Card className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">
              {hasSearchFilters
                ? "No live verified profiles match those filters yet"
                : "Live verified profiles are still being published"}
            </h2>
            <p className="text-sm text-text-muted">
              {hasSearchFilters
                ? "Try broader filters or clear your search. While the live set grows, the benchmark cards above show the expected profile standard."
                : "The benchmark cards above show the quality standard while more live profiles complete verification and publication."}
            </p>
            <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
              {fallbackFeaturedAgent ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Published profile
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {fallbackFeaturedAgent.user.name ?? "Estate agent"} ·{" "}
                    {fallbackFeaturedAgent.agencyName ?? "Independent"} ·{" "}
                    {fallbackFeaturedAgent.serviceAreas.slice(0, 3).join(", ") ||
                      "Service areas being confirmed"}{" "}
                    · {fallbackFeaturedAgent.profileCompleteness}% profile
                    readiness
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Sample completed profile
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    A. Morgan · North Row Estates · London, SW1A, SE1 · 92%
                    profile readiness
                  </p>
                </>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {PUBLIC_AGENT_PROOF_LOOP.slice(0, 4).map((step) => (
                <div
                  key={step.title}
                  className="rounded-md border border-line bg-surface-1 px-3 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {step.status}
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-strong">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" })
                )}
              >
                Create your profile
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
                    Verified WHOMA profile
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
                  <p>Coverage: {agent.serviceAreas.join(", ") || "Not listed"}</p>
                  <p>
                    Specialties: {agent.specialties.join(", ") || "Not listed"}
                  </p>
                  <p>Profile readiness: {agent.profileCompleteness}%</p>
                </div>
                {agent.profileSlug ? (
                  <Link
                    href={`/agents/${agent.profileSlug}`}
                    className="text-sm font-medium text-brand-ink underline"
                  >
                    View profile
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
