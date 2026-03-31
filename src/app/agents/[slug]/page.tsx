import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_REQUESTS_PILOT_HREF
} from "@/lib/public-site";
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

  const displayName = profile.user.name ?? "Estate agent";
  const title = `${displayName} | Verified WHOMA Profile`;
  const description = `${displayName} is publicly visible on WHOMA because the profile is published and admin verified. Review service areas, specialties, and trust markers.`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true
    }
  };
}

const londonDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London"
});

function formatResponseTime(minutes: number | null): string {
  if (!minutes || minutes <= 0) {
    return "";
  }

  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const roundedHours = Math.round((minutes / 60) * 10) / 10;
  return `${roundedHours} hrs`;
}

function formatRating(rating: number | null): string {
  if (!rating || rating <= 0) {
    return "";
  }

  return `${new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1
  }).format(rating)} / 5`;
}

function buildPublicProofBullets(profile: {
  yearsExperience: number | null;
  serviceAreas: string[];
  specialties: string[];
  responseTimeMinutes: number | null;
  achievements: string[];
}): string[] {
  const bullets: string[] = [];

  if (profile.yearsExperience !== null) {
    bullets.push(`${profile.yearsExperience}+ years of estate agency experience.`);
  }

  if (profile.serviceAreas.length > 0) {
    bullets.push(`Active across ${profile.serviceAreas.slice(0, 3).join(", ")}.`);
  }

  if (profile.specialties.length > 0) {
    bullets.push(
      `Structured specialties include ${profile.specialties.slice(0, 2).join(", ")}.`
    );
  }

  if (profile.responseTimeMinutes !== null && profile.responseTimeMinutes > 0) {
    bullets.push(
      `Typical response speed currently published as ${formatResponseTime(profile.responseTimeMinutes)}.`
    );
  }

  if (profile.achievements.length > 0) {
    bullets.push(`Notable proof point: ${profile.achievements[0]}.`);
  }

  if (bullets.length === 0) {
    return [
      "Published and admin verified on WHOMA.",
      "Structured service-area and specialty information is visible.",
      "Public visibility is restricted to trusted pilot profiles."
    ];
  }

  return bullets.slice(0, 3);
}

export default async function PublicAgentProfilePage({
  params
}: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const profile = await getPublicAgentProfileBySlug(slug);
  const site = getPublicSiteConfig();

  if (!profile) {
    notFound();
  }

  const proofBullets = buildPublicProofBullets({
    yearsExperience: profile.yearsExperience,
    serviceAreas: profile.serviceAreas,
    specialties: profile.specialties,
    responseTimeMinutes: profile.responseTimeMinutes,
    achievements: profile.achievements
  });

  const proofStats = [
    profile.yearsExperience !== null
      ? {
          label: "Experience",
          value: `${profile.yearsExperience} ${profile.yearsExperience === 1 ? "year" : "years"}`
        }
      : null,
    profile.responseTimeMinutes
      ? {
          label: "Response speed",
          value: formatResponseTime(profile.responseTimeMinutes)
        }
      : null,
    profile.ratingAggregate
      ? {
          label: "Seller rating",
          value: formatRating(profile.ratingAggregate)
        }
      : null,
    {
      label: "Profile quality",
      value: `${profile.profileCompleteness}% complete`
    },
    profile.publishedAt
      ? {
          label: "Published",
          value: londonDateFormatter.format(profile.publishedAt)
        }
      : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />
          <div className="flex items-center gap-2">
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Back to directory
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

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Verified estate agent profile
              </p>
              <h1 className="text-3xl font-semibold text-text-strong">
                {profile.user.name ?? "Estate agent"}
              </h1>
              <p className="text-sm text-text-muted">
                {profile.jobTitle ?? "Property sales specialist"} ·{" "}
                {profile.agencyName ?? "Independent"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Verified profile</Badge>
                <Badge variant="accent">
                  {profile.serviceAreas.length} service area
                  {profile.serviceAreas.length === 1 ? "" : "s"}
                </Badge>
                <Badge variant="default">
                  {profile.specialties.length} specialt
                  {profile.specialties.length === 1 ? "y" : "ies"}
                </Badge>
              </div>
            </div>

            {proofStats.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {proofStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-md border border-line bg-surface-0 px-3 py-2"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      {stat.label}
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
              >
                Start your own profile
              </Link>
              <Link
                href={PUBLIC_REQUESTS_PILOT_HREF}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                View pilot request areas
              </Link>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">
              Why this profile is public
            </h2>
            <ul className="space-y-2 text-sm text-text-muted">
              {proofBullets.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-line bg-surface-0 px-3 py-2"
                >
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-text-muted">
              WHOMA only shows profiles that are both published and admin verified.
            </p>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">About</h2>
            <p className="text-sm leading-6 text-text-muted">
              {profile.bio ?? "This agent has not added a professional summary yet."}
            </p>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">
              Trust and contact
            </h2>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>Verification: Admin verified</li>
              <li>Work email: {profile.workEmail ?? "Not listed"}</li>
              <li>Phone: {profile.phone ?? "Not listed"}</li>
              <li>
                Last profile update:{" "}
                {profile.updatedAt
                  ? londonDateFormatter.format(profile.updatedAt)
                  : "Not available"}
              </li>
            </ul>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="space-y-3">
            <h3 className="text-base font-semibold text-text-strong">Service areas</h3>
            {profile.serviceAreas.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.serviceAreas.map((area) => (
                  <Badge key={area} variant="accent">
                    {area}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Service areas are not listed yet.</p>
            )}
          </Card>

          <Card className="space-y-3">
            <h3 className="text-base font-semibold text-text-strong">Specialties</h3>
            {profile.specialties.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.specialties.map((specialty) => (
                  <Badge key={specialty} variant="default">
                    {specialty}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Specialties are not listed yet.</p>
            )}
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <h3 className="text-base font-semibold text-text-strong">
              Professional achievements
            </h3>
            {profile.achievements.length ? (
              <ul className="space-y-2 text-sm text-text-muted">
                {profile.achievements.map((achievement) => (
                  <li
                    key={achievement}
                    className="rounded-md border border-line bg-surface-0 px-3 py-2"
                  >
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
                  <li
                    key={language}
                    className="rounded-md border border-line bg-surface-0 px-3 py-2"
                  >
                    {language}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">No languages listed yet.</p>
            )}
          </Card>
        </div>

        <Card className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold text-text-strong">
            Want a WHOMA profile like this?
          </h2>
          <p className="text-sm text-text-muted">
            Start with work-email verification, complete your structured profile, and publish it for admin review.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Build your verified profile
            </Link>
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Browse more verified agents
            </Link>
          </div>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
