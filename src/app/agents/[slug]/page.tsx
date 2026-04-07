import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF
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
  const description = `${displayName} has a published WHOMA profile with service areas, specialties, and professional details available to review.`;

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

function buildPublicProofBullets(profile: {
  yearsExperience: number | null;
  serviceAreas: string[];
  specialties: string[];
  achievements: string[];
  publishedAt: Date | null;
  profileCompleteness: number;
}): string[] {
  const bullets: string[] = [];

  if (profile.yearsExperience !== null) {
    bullets.push(`${profile.yearsExperience}+ years of estate agency experience.`);
  }

  if (profile.serviceAreas.length > 0) {
    bullets.push(`Covers ${profile.serviceAreas.slice(0, 3).join(", ")}.`);
  }

  if (profile.specialties.length > 0) {
    bullets.push(
      `Specialties include ${profile.specialties.slice(0, 2).join(", ")}.`
    );
  }

  if (profile.publishedAt) {
    bullets.push(
      `Published on WHOMA since ${londonDateFormatter.format(profile.publishedAt)}.`
    );
  }

  if (profile.achievements.length > 0) {
    bullets.push(`Notable proof point: ${profile.achievements[0]}.`);
  }

  if (profile.profileCompleteness > 0) {
    bullets.push(
      `Profile readiness is currently ${profile.profileCompleteness}% complete.`
    );
  }

  if (bullets.length === 0) {
    return [
      "Published on WHOMA after profile review.",
      "Service areas and specialties are visible.",
      "Directory visibility is reserved for approved profiles."
    ];
  }

  return bullets.slice(0, 3);
}

export default async function PublicAgentProfilePage({
  params
}: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const profile = await getPublicAgentProfileBySlug(slug);

  if (!profile) {
    notFound();
  }

  const proofBullets = buildPublicProofBullets({
    yearsExperience: profile.yearsExperience,
    serviceAreas: profile.serviceAreas,
    specialties: profile.specialties,
    achievements: profile.achievements,
    publishedAt: profile.publishedAt,
    profileCompleteness: profile.profileCompleteness
  });

  const proofStats = [
    {
      label: "Verification",
      value: "Admin verified",
      note: "Required before public directory visibility"
    },
    profile.yearsExperience !== null
      ? {
          label: "Experience",
          value: `${profile.yearsExperience} ${profile.yearsExperience === 1 ? "year" : "years"}`,
          note: "Self-reported"
        }
      : null,
    {
      label: "Service areas",
      value: String(profile.serviceAreas.length),
      note: "Structured coverage published on profile"
    },
    {
      label: "Specialties",
      value: String(profile.specialties.length),
      note: "Structured specialties published on profile"
    },
    {
      label: "Profile readiness",
      value: `${profile.profileCompleteness}% complete`,
      note: "Structured profile completeness"
    },
    profile.publishedAt
      ? {
          label: "Published",
          value: londonDateFormatter.format(profile.publishedAt),
          note: "Public profile visibility date"
        }
      : null
  ].filter(Boolean) as Array<{ label: string; value: string; note?: string }>;

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Verified WHOMA profile
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
                  {profile.serviceAreas.length} area
                  {profile.serviceAreas.length === 1 ? "" : "s"}
                  {" "}covered
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
                    {stat.note ? (
                      <p className="mt-1 text-xs text-text-muted">{stat.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
              >
                Create your profile
              </Link>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-text-strong">
              Profile standards
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
              WHOMA only publishes profiles once they are approved for
              directory visibility.
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
              <li>Email: {profile.workEmail ?? "Not listed"}</li>
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
            Start with email verification, complete your profile, and
            publish it for review.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={PUBLIC_AGENT_CTA_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
            >
              Create your profile
            </Link>
            <Link
              href={PUBLIC_AGENT_DIRECTORY_HREF}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Browse agents
            </Link>
          </div>
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
