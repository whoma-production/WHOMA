import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, Route } from "next";

import { CookieConsentPanel } from "@/components/layout/cookie-consent-panel";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { Card } from "@/components/ui/card";
import { PUBLIC_FAQS_HREF, getPublicSiteConfig } from "@/lib/public-site";
import {
  getLiveInstructionCards,
  getLiveInstructionLocationSummaries
} from "@/server/marketplace/queries";

type LegalSlug = "privacy" | "cookies" | "terms" | "complaints";
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
  "complaints"
] as const;
const staticPageSlugs: readonly StaticPageSlug[] = [
  ...legalSlugs,
  "sitemap"
] as const;
const sitemapPublicPages: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/agents", label: "Agents" },
  { href: PUBLIC_FAQS_HREF, label: "FAQs" },
  { href: "/sign-in", label: "Sign in" },
  { href: "/sign-up?role=AGENT", label: "Create account" },
  { href: "/contact", label: "Contact" }
];

function getLegalContent(
  site: ReturnType<typeof getPublicSiteConfig>
): Record<LegalSlug, LegalPageContent> {
  return {
    privacy: {
      title: "Privacy Policy",
      intro:
        "This page explains what WHOMA collects, why it is needed, and how the platform protects your data.",
      sections: [
        {
          heading: "What data WHOMA handles",
          paragraphs: [
            "We handle account identity details, role selection, email verification data, public profile information, and support or complaints correspondence needed to operate WHOMA.",
            "Where seller access is active, we also handle instruction data, structured offers, shortlist or award decisions, and message records tied to the relevant participants."
          ]
        },
        {
          heading: "Why it is handled",
          paragraphs: [
            "Data is used to verify identity, publish and review professional profiles, protect the service from misuse, operate structured collaboration, and respond to support, privacy, or complaints requests.",
            "WHOMA keeps data use focused on running secure accounts, trusted profiles, and reliable support."
          ]
        },
        {
          heading: "Sharing, retention, and contact",
          paragraphs: [
            "We do not sell personal data. Operational providers only receive the minimum information required to run authentication, hosting, storage, email verification, or optional resume processing.",
            "WHOMA works with trusted providers for sign-in, hosting, database reliability, and email delivery, with least-access controls applied to each service.",
            `Privacy requests should be sent to ${site.supportEmail}. Include the account email, profile slug, or request reference so the team can locate the relevant record quickly.`
          ]
        }
      ]
    },
    cookies: {
      title: "Cookies Policy",
      intro:
        "WHOMA uses cookies and similar storage only where needed for secure sign-in, session continuity, and consent preferences.",
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
            "WHOMA does not currently use broad public marketing analytics. If non-essential analytics are added, this page and the consent controls will be updated first.",
            "Until then, the consent panel explains essential cookies only."
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
        "These terms govern use of WHOMA's profile, verification, and collaboration services.",
      sections: [
        {
          heading: "Current service scope",
          paragraphs: [
            "WHOMA centres on verified estate-agent identity, structured public profiles, and structured collaboration.",
            "Seller access is selective and controlled. WHOMA is not a public comparison portal or open-listing marketplace.",
            "WHOMA is not acting as an estate agent, broker, valuation provider, conveyancer, or legal adviser unless a separate signed service agreement states otherwise."
          ]
        },
        {
          heading: "User responsibilities",
          paragraphs: [
            "Users must provide accurate information, avoid impersonation or misuse of another party's data, and only submit profile or collaboration information they are entitled to share.",
            "Agents are responsible for the truthfulness of profile claims and structured offer content submitted through WHOMA."
          ]
        },
        {
          heading: "Platform limits",
          paragraphs: [
            "WHOMA does not currently process transaction payments in-platform, and verification markers should not be treated as guarantees of outcome.",
            "Independent due diligence still matters before instructing, shortlisting, awarding, or transacting with another party."
          ]
        }
      ]
    },
    complaints: {
      title: "Complaints",
      intro:
        "This page explains how to raise a complaint and how WHOMA reviews service issues.",
      sections: [
        {
          heading: "How to raise a complaint",
          paragraphs: [
            `Send complaints to ${site.supportEmail} and include the account email, public profile slug, or request reference wherever possible.`,
            "WHOMA reviews complaints in order of urgency and will confirm next steps if a case needs a longer investigation."
          ]
        },
        {
          heading: "Response windows",
          paragraphs: [
            "We acknowledge complaint submissions within 1 business day.",
            "We aim to provide a substantive response within 5 business days. If a case needs deeper investigation, we send an interim update and next review date."
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
    <div className="min-h-[100dvh] bg-surface-1">
      <PublicHeader />

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link
            href={"/" as Route}
            className="text-sm font-medium text-text-muted transition-colors hover:text-brand-ink"
          >
            Back to home
          </Link>
        </div>
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              WHOMA
            </p>
            <h1>{getPageTitle(slug, legalContent)}</h1>
            {slug === "sitemap" ? (
              <p className="text-sm text-text-muted">
                HTML sitemap for WHOMA&apos;s public pages and selective seller
                access routes.
              </p>
            ) : (
              <>
                <p className="text-sm text-text-muted">
                  {legalContent[slug].intro}
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
                  <h2 className="text-lg">Seller access areas</h2>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                    {locationSummaries.length} areas
                  </span>
                </div>
                {locationSummaries.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No seller-access areas are currently listed.
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
                          {location.instructionsCount} open instruction
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
