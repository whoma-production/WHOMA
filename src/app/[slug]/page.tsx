import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, Route } from "next";

import { Logo } from "@/components/brand/logo";
import { CookieConsentPanel } from "@/components/layout/cookie-consent-panel";
import { PublicFooter } from "@/components/layout/public-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicSiteConfig, getSupportMailto } from "@/lib/public-site";
import { cn } from "@/lib/utils";
import {
  getLiveInstructionCards,
  getLiveInstructionLocationSummaries
} from "@/server/marketplace/queries";

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

interface OperationalProcessor {
  name: string;
  purpose: string;
  status: string;
}

const LAST_UPDATED_LABEL = "April 2, 2026";

const legalSlugs: readonly LegalSlug[] = [
  "privacy",
  "cookies",
  "terms",
  "complaints",
  "contact"
] as const;
const staticPageSlugs: readonly StaticPageSlug[] = [
  ...legalSlugs,
  "sitemap"
] as const;
const sitemapPublicPages: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up", label: "Sign up" },
  { href: "/agents", label: "Verified agent profiles" },
  { href: "/requests", label: "Limited collaboration pilot" }
];

function getOperationalProcessors(): OperationalProcessor[] {
  return [
    {
      name: "Auth.js + Google OAuth",
      purpose:
        "public sign-in, session handling, and role-aware access control",
      status:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? "Enabled for live Google sign-in"
          : "Configured as the primary auth path when credentials are available"
    },
    {
      name: "Railway + Postgres + Prisma",
      purpose:
        "application hosting, persistence, and structured workflow records",
      status: "Current operational stack"
    },
    {
      name: "Resend",
      purpose: "business work-email verification delivery for agents",
      status:
        process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
          ? "Configured for production delivery"
          : "Used when production email credentials are configured"
    },
    {
      name: "Upstash Redis",
      purpose: "shared rate limiting and idempotency storage when enabled",
      status:
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
          ? "Enabled as shared API safety infrastructure"
          : "Optional shared infrastructure"
    },
    {
      name: "OpenAI resume intake",
      purpose: "optional resume suggestion extraction during agent onboarding",
      status:
        process.env.ENABLE_RESUME_AI_PREFILL === "true"
          ? "Enabled for opted-in resume processing"
          : "Disabled by default"
    }
  ];
}

function getLegalContent(
  site: ReturnType<typeof getPublicSiteConfig>
): Record<LegalSlug, LegalPageContent> {
  return {
    privacy: {
      title: "Privacy Policy",
      intro: `${site.companyLegalName} operates WHOMA as a ${site.betaStatusLabel.toLowerCase()} in the ${site.operatingRegion}. This page explains what pilot data is handled, why it is handled, and which operational providers are involved.`,
      sections: [
        {
          heading: "What data WHOMA handles",
          paragraphs: [
            "We handle account identity details, role selection, business work-email verification data, public profile information, and support or complaints correspondence needed to operate the pilot responsibly.",
            "Where the collaboration pilot is active, we also handle homeowner-request data, structured proposals, shortlist or award decisions, and message-thread records tied to the relevant participants."
          ]
        },
        {
          heading: "Why it is handled",
          paragraphs: [
            "Pilot data is used to verify identity, publish and review professional profiles, protect the product from abuse, operate the structured collaboration flow, and respond to support, privacy, or complaints requests.",
            "WHOMA prefers low-PII operational metrics and audit trails over broad behavioural profiling."
          ]
        },
        {
          heading: "Sharing, retention, and contact",
          paragraphs: [
            "We do not sell personal data. Operational providers only receive the minimum information required to run authentication, hosting, storage, email verification, or optional AI resume processing.",
            `Privacy requests should be sent to ${site.supportEmail}. Include the account email, profile slug, or request reference so the team can locate the relevant record quickly.`
          ]
        }
      ]
    },
    cookies: {
      title: "Cookies Policy",
      intro:
        "WHOMA currently uses cookies and similar storage only where needed for secure sign-in, session continuity, and product controls that keep pilot access reliable.",
      sections: [
        {
          heading: "Essential cookies",
          paragraphs: [
            "Essential cookies support authentication, session continuity, CSRF protection, and other security-sensitive platform behaviour.",
            "These cookies are required for protected app routes and cannot be disabled while using signed-in WHOMA surfaces."
          ]
        },
        {
          heading: "Non-essential cookies",
          paragraphs: [
            "WHOMA does not currently run broad public marketing analytics as part of this pilot. If non-essential analytics are added later, this page and the consent controls will be updated before rollout.",
            "Until then, the consent panel is limited to essential-cookie clarity and future preference readiness."
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
        "These terms describe the current product boundary: WHOMA is running a controlled pilot for verified identity, reputation, and structured collaboration infrastructure.",
      sections: [
        {
          heading: "Current service scope",
          paragraphs: [
            "WHOMA currently leads with verified estate-agent identity, structured public profiles, and admin-reviewed trust. Collaboration tooling remains a limited pilot rather than a broad public comparison marketplace.",
            "WHOMA is not acting as an estate agent, broker, valuation provider, conveyancer, or legal adviser unless a separate signed service agreement states otherwise."
          ]
        },
        {
          heading: "User responsibilities",
          paragraphs: [
            "Users must provide accurate information, avoid impersonation or misuse of another party's data, and only submit profile or collaboration information they are entitled to share.",
            "Agents are responsible for the truthfulness of profile claims and structured proposal content submitted through the pilot."
          ]
        },
        {
          heading: "Platform limits",
          paragraphs: [
            "WHOMA does not process transaction payments in-platform during this stage, and pilot visibility or verification markers should not be treated as guarantees of outcome.",
            "Independent due diligence still matters before instructing, shortlisting, awarding, or transacting with another party."
          ]
        }
      ]
    },
    complaints: {
      title: "Complaints and Support",
      intro:
        "WHOMA handles pilot complaints through a named support route so verification, access, data, and collaboration issues can be reviewed against the actual operational record.",
      sections: [
        {
          heading: "How to raise a complaint",
          paragraphs: [
            `Send complaints to ${site.supportEmail} and include the account email, public profile slug, or request reference wherever possible.`,
            `WHOMA aims to acknowledge complaints within ${site.supportResponseWindow.toLowerCase()} and will explain if a case needs a longer review.`
          ]
        },
        {
          heading: "How cases are reviewed",
          paragraphs: [
            "Where a complaint relates to verification, profile visibility, shortlist decisions, or collaboration records, WHOMA may review the relevant audit history and structured workflow data needed to resolve the case fairly.",
            "Repeated or safety-related issues are handled with higher priority than general product feedback."
          ]
        },
        {
          heading: "Escalation path",
          paragraphs: [
            "If the first response does not resolve the issue, WHOMA will confirm the next review step, who is handling it, and whether any additional evidence is needed.",
            "If you are reporting an urgent access or misuse issue, say that clearly in the subject line so the case can be triaged faster."
          ]
        }
      ]
    },
    contact: {
      title: "Contact and Pilot Access",
      intro:
        "This is the operational contact route for pilot access, verification questions, profile support, privacy queries, complaints, and partnership conversations.",
      sections: [
        {
          heading: "Primary support route",
          paragraphs: [
            `Email ${site.supportEmail}. This inbox is the named support channel for WHOMA's current pilot.`,
            `Typical response window: ${site.supportResponseWindow}. ${site.supportCoverage}`
          ]
        },
        {
          heading: "What to include",
          paragraphs: [
            "Include your account email, public profile slug, or request reference where relevant so the team can locate the right operational record quickly.",
            "Please also state whether the enquiry relates to agent onboarding, verification, profile visibility, collaboration pilot access, privacy, or partnerships."
          ]
        },
        {
          heading: "Pilot operating status",
          paragraphs: [
            `${site.companyLegalName} is currently running WHOMA as a ${site.betaStatusLabel.toLowerCase()} in the ${site.operatingRegion}.`,
            "Public access, provider configuration, and rollout boundaries may evolve as the pilot matures, but support continues through the same monitored route."
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

function getPageTitle(
  slug: StaticPageSlug,
  legalContent: Record<LegalSlug, LegalPageContent>
): string {
  if (slug === "sitemap") {
    return "Sitemap";
  }

  return legalContent[slug].title;
}

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: StaticPageSlug }> {
  return staticPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
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

export default async function StaticPage({
  params
}: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const site = getPublicSiteConfig();
  const legalContent = getLegalContent(site);
  const operationalProcessors = getOperationalProcessors();

  if (!isStaticPageSlug(slug)) {
    notFound();
  }

  const liveInstructions =
    slug === "sitemap" && process.env.DATABASE_URL
      ? await getLiveInstructionCards()
      : [];
  const locationSummaries =
    slug === "sitemap"
      ? getLiveInstructionLocationSummaries(liveInstructions)
      : [];

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />
          <Link
            href="/"
            className="text-sm font-medium text-text-muted transition-colors hover:text-brand-ink"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              WHOMA
            </p>
            <h1>{getPageTitle(slug, legalContent)}</h1>
            {slug === "sitemap" ? (
              <p className="text-sm text-text-muted">
                HTML sitemap for the primary public pages plus the limited
                collaboration pilot routes.
              </p>
            ) : (
              <>
                <p className="text-sm text-text-muted">
                  {legalContent[slug].intro}
                </p>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                  Last updated: {LAST_UPDATED_LABEL}
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
                      <Link
                        href={page.href as Route}
                        className="transition-colors hover:text-brand-ink"
                      >
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
                      <Link
                        href={`/${legalSlug}` as Route}
                        className="transition-colors hover:text-brand-ink"
                      >
                        {legalContent[legalSlug].title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-3 bg-surface-1 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg">Live pilot request routes</h2>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                    {locationSummaries.length} areas
                  </span>
                </div>
                {locationSummaries.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No live request areas are currently listed. That is expected
                    when the collaboration pilot is kept narrow.
                  </p>
                ) : (
                  <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                    {locationSummaries.map((location) => (
                      <li
                        key={location.postcodeDistrict}
                        className="rounded-md border border-line bg-surface-0 px-3 py-2"
                      >
                        <Link
                          href={
                            `/requests/${location.postcodeDistrict}` as Route
                          }
                          className="transition-colors hover:text-brand-ink"
                        >
                          {location.city} · {location.postcodeDistrict} (
                          {location.instructionsCount} live pilot request
                          {location.instructionsCount === 1 ? "" : "s"})
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="space-y-4 bg-surface-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Pilot status
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {site.betaStatusLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Operating entity
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {site.companyLegalName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Primary support route
                    </p>
                    <a
                      href={getSupportMailto(site.supportEmail)}
                      className="text-sm font-medium text-brand-ink underline"
                    >
                      {site.supportEmail}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Typical response window
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {site.supportResponseWindow}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Operating region
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {site.operatingRegion}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Support handling
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {site.supportCoverage}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={getSupportMailto(site.supportEmail)}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "sm" })
                    )}
                  >
                    Email support
                  </a>
                  <Link
                    href="/complaints"
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" })
                    )}
                  >
                    Complaints route
                  </Link>
                </div>
              </Card>

              <Card className="space-y-3 bg-surface-1">
                <div className="space-y-1">
                  <h2 className="text-lg">
                    Current providers and operational stack
                  </h2>
                  <p className="text-sm text-text-muted">
                    These are the main providers WHOMA uses or is configured to
                    use for the current pilot.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {operationalProcessors.map((processor) => (
                    <div
                      key={processor.name}
                      className="rounded-md border border-line bg-surface-0 px-3 py-3"
                    >
                      <p className="text-sm font-medium text-text-strong">
                        {processor.name}
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        {processor.purpose}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                        {processor.status}
                      </p>
                    </div>
                  ))}
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

              {slug === "cookies" ? <CookieConsentPanel /> : null}
            </div>
          )}
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
