import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, Route } from "next";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card } from "@/components/ui/card";
import {
  getPublicSiteConfig,
  getSupportMailto
} from "@/lib/public-site";
import { getLiveInstructionLocationSummaries } from "@/lib/mock/live-instructions";

type LegalSlug = "privacy" | "cookies" | "terms" | "complaints" | "contact";
type StaticPageSlug = LegalSlug | "sitemap";

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface LegalPageContent {
  title: string;
  intro: string;
  sections: LegalSection[];
}

const legalSlugs: readonly LegalSlug[] = [
  "privacy",
  "cookies",
  "terms",
  "complaints",
  "contact"
] as const;
const staticPageSlugs: readonly StaticPageSlug[] = [...legalSlugs, "sitemap"] as const;
const sitemapPublicPages: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Sign up" },
  { href: "/agents", label: "Verified agent profiles" }
];

function getLegalContent(site: ReturnType<typeof getPublicSiteConfig>): Record<LegalSlug, LegalPageContent> {
  return {
    privacy: {
      title: "Privacy Policy",
      intro:
        `${site.companyLegalName} runs WHOMA as a ${site.betaStatusLabel.toLowerCase()}. This policy explains how pilot account, profile, request, and messaging data is handled.`,
      sections: [
        {
          heading: "What data we collect",
          paragraphs: [
            "We collect the account and profile information needed to verify identity, operate the pilot, review profiles, and maintain a secure audit trail.",
            "Where homeowner pilot access is active, we also collect request details, structured agent responses, and message-thread records needed to run the controlled workflow."
          ]
        },
        {
          heading: "How we use data",
          paragraphs: [
            "Data is used to provide sign-in, route users into the correct role flow, evaluate profile completeness, support admin verification, and respond to support or complaints queries.",
            "WHOMA prefers privacy-conscious operational metrics over unnecessary personal analytics."
          ]
        },
        {
          heading: "Sharing and retention",
          paragraphs: [
            "We do not sell personal data. Infrastructure, auth, email delivery, and hosting partners only receive the minimum information required to operate the pilot.",
            `If you have a privacy question, contact ${site.supportEmail}.`
          ]
        }
      ]
    },
    cookies: {
      title: "Cookies Policy",
      intro:
        "WHOMA currently uses cookies and similar storage only where needed to support secure sign-in, sessions, and product controls.",
      sections: [
        {
          heading: "Essential cookies",
          paragraphs: [
            "Essential cookies support authentication, session continuity, CSRF protection, and other security-sensitive application behaviors.",
            "These cookies are required for pilot access and protected app routes."
          ]
        },
        {
          heading: "Preferences and analytics",
          paragraphs: [
            "If non-essential analytics are enabled later, WHOMA will continue to favor low-PII aggregate instrumentation over profiling.",
            "Cookie preferences will be updated as the public beta expands."
          ]
        },
        {
          heading: "Questions",
          paragraphs: [
            `For cookie or consent questions, contact ${site.supportEmail}.`
          ]
        }
      ]
    },
    terms: {
      title: "Terms of Use",
      intro:
        "These terms describe how WHOMA's current pilot should be used and what the platform does at this stage.",
      sections: [
        {
          heading: "Current pilot scope",
          paragraphs: [
            "WHOMA is currently focused on verified estate agent identity, structured public profiles, and admin-reviewed trust. Homeowner tendering remains a controlled secondary pilot path.",
            "WHOMA is not acting as an estate agent, broker, valuation provider, or legal adviser unless a separate service agreement explicitly states otherwise."
          ]
        },
        {
          heading: "User responsibilities",
          paragraphs: [
            "Users must provide accurate information, respect platform rules, and avoid misuse of other users' data or identity claims.",
            "Agents are responsible for the truthfulness of profile information and any structured responses submitted through the pilot."
          ]
        },
        {
          heading: "Limits",
          paragraphs: [
            "WHOMA does not process transaction payments in-platform during this phase.",
            "Verification markers are trust signals for the pilot, not guarantees or substitutes for independent due diligence."
          ]
        }
      ]
    },
    complaints: {
      title: "Complaints and Support",
      intro:
        "WHOMA aims to handle pilot issues quickly and clearly, especially where verification, access, or data concerns are involved.",
      sections: [
        {
          heading: "How to raise a complaint",
          paragraphs: [
            `Send complaints to ${site.supportEmail} and include the relevant account email, profile slug, or pilot request reference where possible.`,
            `We aim to acknowledge complaints within ${site.supportResponseWindow}.`
          ]
        },
        {
          heading: "How we review issues",
          paragraphs: [
            "Where a complaint relates to platform behavior, profile verification, or a pilot request interaction, WHOMA may review internal records and audit history needed to resolve it fairly.",
            "We keep case notes so repeated issues can be handled consistently."
          ]
        },
        {
          heading: "Escalation",
          paragraphs: [
            "If an issue cannot be resolved in the first response, we will explain the next review step and who is handling it.",
            "Safety or account-access issues are prioritized ahead of general product feedback."
          ]
        }
      ]
    },
    contact: {
      title: "Contact",
      intro:
        "Use this page for pilot access, verification questions, support requests, and partnership conversations.",
      sections: [
        {
          heading: "Pilot support",
          paragraphs: [
            `Email ${site.supportEmail} for account access, verification questions, profile issues, or pilot request support.`,
            `Typical response window: ${site.supportResponseWindow}.`
          ]
        },
        {
          heading: "Partnerships and beta access",
          paragraphs: [
            "Use the same support channel for agency partnerships, founder conversations, or manual beta access requests.",
            "Please mention whether you are an estate agent, homeowner, or partner so the team can route the enquiry correctly."
          ]
        },
        {
          heading: "Operating status",
          paragraphs: [
            `${site.companyLegalName} is currently running WHOMA as a ${site.betaStatusLabel.toLowerCase()}.`,
            "Public visibility and access rules may evolve as the pilot expands."
          ]
        }
      ]
    }
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function isStaticPageSlug(value: string): value is StaticPageSlug {
  return (staticPageSlugs as readonly string[]).includes(value);
}

function getPageTitle(slug: StaticPageSlug, legalContent: Record<LegalSlug, LegalPageContent>): string {
  if (slug === "sitemap") {
    return "Sitemap";
  }

  return legalContent[slug].title;
}

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: StaticPageSlug }> {
  return staticPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = getPublicSiteConfig();
  const legalContent = getLegalContent(site);

  if (!isStaticPageSlug(slug)) {
    return {};
  }

  return {
    title: `WHOMA | ${getPageTitle(slug, legalContent)}`
  };
}

export default async function StaticPage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const site = getPublicSiteConfig();
  const legalContent = getLegalContent(site);

  if (!isStaticPageSlug(slug)) {
    notFound();
  }

  const locationSummaries = slug === "sitemap" ? getLiveInstructionLocationSummaries() : [];

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />
          <Link href="/" className="text-sm font-medium text-text-muted transition-colors hover:text-brand-ink">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Whoma</p>
            <h1>{getPageTitle(slug, legalContent)}</h1>
            {slug === "sitemap" ? (
              <p className="text-sm text-text-muted">
                HTML sitemap for the primary public pages plus secondary pilot request routes.
              </p>
            ) : (
              <>
                <p className="text-sm text-text-muted">{legalContent[slug].intro}</p>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                  Last updated: March 31, 2026
                </p>
              </>
            )}
          </div>

          {slug === "sitemap" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="space-y-3 bg-surface-1">
                <h2 className="text-lg">Primary public pages</h2>
                <ul className="space-y-2 text-sm text-text-muted">
                  {sitemapPublicPages.map((page) => (
                    <li key={page.href}>
                      <Link href={page.href as Route} className="transition-colors hover:text-brand-ink">
                        {page.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-3 bg-surface-1">
                <h2 className="text-lg">Trust and support</h2>
                <ul className="space-y-2 text-sm text-text-muted">
                  {legalSlugs.map((legalSlug) => (
                    <li key={legalSlug}>
                      <Link href={`/${legalSlug}` as Route} className="transition-colors hover:text-brand-ink">
                        {legalContent[legalSlug].title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-3 bg-surface-1 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg">Pilot request area routes</h2>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                    {locationSummaries.length} areas
                  </span>
                </div>
                <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                  {locationSummaries.map((location) => (
                    <li key={location.postcodeDistrict} className="rounded-md border border-line bg-surface-0 px-3 py-2">
                      <Link href={`/requests/${location.postcodeDistrict}` as Route} className="transition-colors hover:text-brand-ink">
                        {location.city} · {location.postcodeDistrict} ({location.instructionsCount} live pilot request
                        {location.instructionsCount === 1 ? "" : "s"})
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="space-y-3 bg-surface-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Pilot status</p>
                    <p className="text-sm font-medium text-text-strong">{site.betaStatusLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Operating entity</p>
                    <p className="text-sm font-medium text-text-strong">{site.companyLegalName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Support email</p>
                    <a
                      href={getSupportMailto(site.supportEmail)}
                      className="text-sm font-medium text-brand-ink underline"
                    >
                      {site.supportEmail}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Typical response window</p>
                    <p className="text-sm font-medium text-text-strong">{site.supportResponseWindow}</p>
                  </div>
                </div>
              </Card>

              {legalContent[slug].sections.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h2 className="text-lg">{section.heading}</h2>
                  <div className="space-y-2 text-sm text-text-muted">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
