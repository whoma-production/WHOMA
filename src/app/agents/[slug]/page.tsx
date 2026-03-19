import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPublicAgentProfileBySlug } from "@/server/agent-profile/service";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicAgentProfileBySlug(slug);

  if (!profile) {
    return {
      title: "Agent profile not found | WHOMA"
    };
  }

  const displayName = profile.user.name ?? "Real estate agent";
  const title = `${displayName} | WHOMA Real Estate Agent Profile`;
  const description = `${displayName} showcases their professional real estate profile, service areas, and expertise on WHOMA.`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true
    }
  };
}

export default async function PublicAgentProfilePage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const profile = await getPublicAgentProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle="Where Home Owners Meet Real Estate Agents" />
          <Link href="/agents" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            Back to directory
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">WHOMA Public Profile</p>
            <h1 className="text-3xl font-semibold text-text-strong">{profile.user.name ?? "Real estate agent"}</h1>
            <p className="text-sm text-text-muted">
              {profile.jobTitle ?? "Property sales specialist"} · {profile.agencyName ?? "Independent"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Verification</p>
              <p className="text-sm font-medium text-text-strong">{profile.verificationStatus}</p>
            </div>
            <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Experience</p>
              <p className="text-sm font-medium text-text-strong">
                {profile.yearsExperience ?? 0} {profile.yearsExperience === 1 ? "year" : "years"}
              </p>
            </div>
            <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Profile completeness</p>
              <p className="text-sm font-medium text-text-strong">{profile.profileCompleteness}%</p>
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">Professional summary</h2>
            <p className="text-sm leading-6 text-text-muted">
              {profile.bio ?? "This agent has not added a professional summary yet."}
            </p>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">Contact and coverage</h2>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>Work email: {profile.workEmail ?? "Not listed"}</li>
              <li>Phone: {profile.phone ?? "Not listed"}</li>
              <li>Service areas: {profile.serviceAreas.join(", ") || "Not listed"}</li>
              <li>Specialties: {profile.specialties.join(", ") || "Not listed"}</li>
            </ul>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <h3 className="text-base font-semibold text-text-strong">Professional achievements</h3>
            {profile.achievements.length ? (
              <ul className="space-y-2 text-sm text-text-muted">
                {profile.achievements.map((achievement) => (
                  <li key={achievement} className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    {achievement}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">No achievements listed yet.</p>
            )}
          </Card>

          <Card className="space-y-2">
            <h3 className="text-base font-semibold text-text-strong">Languages</h3>
            {profile.languages.length ? (
              <ul className="space-y-2 text-sm text-text-muted">
                {profile.languages.map((language) => (
                  <li key={language} className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    {language}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">No languages listed yet.</p>
            )}
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
