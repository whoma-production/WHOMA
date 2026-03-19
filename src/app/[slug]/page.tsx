import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card } from "@/components/ui/card";
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

const legalSlugs: readonly LegalSlug[] = ["privacy", "cookies", "terms", "complaints", "contact"] as const;
const staticPageSlugs: readonly StaticPageSlug[] = [...legalSlugs, "sitemap"] as const;

const legalContent: Record<LegalSlug, LegalPageContent> = {
  privacy: {
    title: "Privacy Policy",
    intro:
      "Whoma is committed to handling personal data responsibly. This placeholder policy explains the intended data handling approach for the MVP and must be reviewed by legal counsel before public launch.",
    sections: [
      {
        heading: "What data we collect",
        paragraphs: [
          "We may collect account details, profile information, property and instruction details, proposal content, and messages required to operate the marketplace.",
          "We aim to collect only the information needed to match homeowners and real estate agents, support proposal comparison, and maintain a secure audit trail."
        ]
      },
      {
        heading: "How we use data",
        paragraphs: [
          "Data is used to provide core product functionality, maintain account security, communicate about instructions and proposals, and meet legal or compliance obligations.",
          "Whoma will avoid using personally identifiable data for unnecessary analytics and will prefer privacy-conscious event counts where possible."
        ]
      },
      {
        heading: "Retention and sharing",
        paragraphs: [
          "Data retention periods and third-party processors will be listed here once infrastructure and compliance choices are finalized.",
          "Whoma does not intend to sell personal data. Any service providers used to operate the product will be disclosed in the final policy."
        ]
      }
    ]
  },
  cookies: {
    title: "Cookies Policy",
    intro:
      "This page describes the intended cookie and similar-storage usage for the Whoma MVP. Final wording and consent categories require legal review before launch.",
    sections: [
      {
        heading: "Essential cookies",
        paragraphs: [
          "Essential cookies may be used for authentication, session security, CSRF protection, and basic application functionality.",
          "These cookies are necessary for core marketplace features such as sign-in, protected routes, and user actions."
        ]
      },
      {
        heading: "Analytics and preferences",
        paragraphs: [
          "If analytics are enabled, Whoma will prefer minimal, privacy-conscious tracking focused on aggregate product usage rather than personal profiling.",
          "Cookie consent preferences and opt-in behavior will be documented here once the consent mechanism is implemented."
        ]
      },
      {
        heading: "Consent status",
        paragraphs: [
          "TODO: Add cookie consent mechanism and a user-visible preferences control before production launch.",
          "This placeholder page is not a substitute for a reviewed cookie consent implementation."
        ]
      }
    ]
  },
  terms: {
    title: "Terms of Use",
    intro:
      "These draft platform terms describe how users are expected to use Whoma. They are placeholders for MVP development and require legal review before launch.",
    sections: [
      {
        heading: "Platform role",
        paragraphs: [
          "Whoma provides a marketplace workflow for homeowners and real estate agents to exchange structured proposals during a bid window.",
          "Whoma is not acting as a real estate agent, broker, valuation provider, or legal adviser unless explicitly stated in a future service agreement."
        ]
      },
      {
        heading: "User responsibilities",
        paragraphs: [
          "Users must provide accurate information, comply with applicable laws, and avoid misuse of the platform or other users' data.",
          "Agents are responsible for the accuracy of proposal fees, inclusions, timelines, and terms submitted through the platform."
        ]
      },
      {
        heading: "MVP limitations",
        paragraphs: [
          "The MVP does not process payments and may include manual verification statuses that have limited scope.",
          "Detailed service terms, liability limitations, and dispute terms will be finalized in reviewed legal documentation."
        ]
      }
    ]
  },
  complaints: {
    title: "Complaints and Support",
    intro:
      "Whoma aims to resolve issues quickly and fairly. This page outlines a simple MVP complaints and support process and requires operational and legal review before launch.",
    sections: [
      {
        heading: "How to contact support",
        paragraphs: [
          "Use the Contact page details for general support requests. Include the instruction ID or proposal ID if your issue relates to a marketplace interaction.",
          "For urgent safety or account access concerns, mark your message as urgent and do not share sensitive documents over unsecured channels."
        ]
      },
      {
        heading: "Complaints process (draft)",
        paragraphs: [
          "We aim to acknowledge complaints promptly and provide a response timeline once support operations are live.",
          "Where a complaint relates to another user, Whoma may review platform records and message history within the limits described in the privacy policy."
        ]
      },
      {
        heading: "Escalation and records",
        paragraphs: [
          "A final policy will explain escalation channels, expected response windows, and record-keeping responsibilities.",
          "TODO: Replace this placeholder with a reviewed complaints procedure and support contact channels before launch."
        ]
      }
    ]
  },
  contact: {
    title: "Contact",
    intro:
      "Use this page to contact Whoma for support, partnership enquiries, or early-access questions. Contact details below are placeholders and must be confirmed before launch.",
    sections: [
      {
        heading: "General support",
        paragraphs: [
          "Email (placeholder): support@whoma.example",
          "Please include your account email and relevant instruction or proposal reference where possible."
        ]
      },
      {
        heading: "Business and partnerships",
        paragraphs: [
          "Email (placeholder): partnerships@whoma.example",
          "Use this channel for agency onboarding partnerships, beta collaborations, and product feedback."
        ]
      },
      {
        heading: "Response expectations",
        paragraphs: [
          "MVP support hours, SLAs, and escalation contacts will be listed here after operational review.",
          "TODO: Replace placeholder contact details and add verified support channels before launch."
        ]
      }
    ]
  }
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

function isStaticPageSlug(value: string): value is StaticPageSlug {
  return (staticPageSlugs as readonly string[]).includes(value);
}

function getPageTitle(slug: StaticPageSlug): string {
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

  if (!isStaticPageSlug(slug)) {
    return {};
  }

  return {
    title: `WHOMA | ${getPageTitle(slug)}`
  };
}

export default async function StaticPage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;

  if (!isStaticPageSlug(slug)) {
    notFound();
  }

  const locationSummaries = slug === "sitemap" ? getLiveInstructionLocationSummaries() : [];

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo subtitle="Where Home Owners Meet Real Estate Agents" />
          <Link href="/" className="text-sm font-medium text-text-muted transition-colors hover:text-brand-ink">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Whoma</p>
            <h1>{getPageTitle(slug)}</h1>
            {slug === "sitemap" ? (
              <p className="text-sm text-text-muted">
                HTML sitemap for key public pages and location browse routes in the Whoma MVP.
              </p>
            ) : (
              <>
                <p className="text-sm text-text-muted">{legalContent[slug].intro}</p>
                <div className="rounded-md border border-line bg-surface-1 px-4 py-3 text-sm text-text-muted">
                  TODO: Legal review required before production launch. This page is placeholder MVP copy.
                </div>
              </>
            )}
          </div>

          {slug === "sitemap" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="space-y-3 bg-surface-1">
                <h2 className="text-lg">Public pages</h2>
                <ul className="space-y-2 text-sm text-text-muted">
                    {[
                      { href: "/", label: "Home" },
                      { href: "/sign-in", label: "Sign in" },
                      { href: "/sign-up", label: "Sign up" },
                      { href: "/agents", label: "Real estate agent directory" },
                      { href: "/locations", label: "Browse Instructions by location" }
                    ].map((page) => (
                    <li key={page.href}>
                      <Link href={page.href} className="transition-colors hover:text-brand-ink">
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
                      <Link href={`/${legalSlug}`} className="transition-colors hover:text-brand-ink">
                        {legalContent[legalSlug].title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-3 bg-surface-1 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg">Location browse routes (LIVE Instructions)</h2>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                    {locationSummaries.length} locations
                  </span>
                </div>
                <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                  {locationSummaries.map((location) => (
                    <li key={location.postcodeDistrict} className="rounded-md border border-line bg-surface-0 px-3 py-2">
                      <Link href={`/locations/${location.postcodeDistrict}`} className="transition-colors hover:text-brand-ink">
                        {location.city} · {location.postcodeDistrict} ({location.instructionsCount} live instruction
                        {location.instructionsCount === 1 ? "" : "s"})
                      </Link>
                    </li>
                  ))}
                </ul>
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
            </div>
          )}
        </Card>
      </main>

      <PublicFooter />
    </div>
  );
}
