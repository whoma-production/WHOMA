import Link from "next/link";
import type { Route } from "next";

import { Logo } from "@/components/brand/logo";
import { getPublicSiteConfig, getSupportMailto } from "@/lib/public-site";

const footerSections = [
  {
    title: "Product",
    links: [
      { href: "/#platform", label: "Platform" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/agents", label: "Agents" },
      { href: "/sign-up?role=AGENT", label: "Create profile" }
    ]
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/complaints", label: "Complaints" }
    ]
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/cookies#manage-consent", label: "Cookies" },
      { href: "/terms", label: "Terms" },
      { href: "/complaints", label: "Complaints" }
    ]
  }
] as const;

export function PublicFooter(): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <footer className="border-t border-line bg-surface-0">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:px-8">
        <div className="space-y-3">
          <Logo subtitle={site.logoSubtitle} />
          <p className="max-w-sm text-sm text-text-muted">
            WHOMA helps independent estate agents build verified identity,
            portable reputation, and structured collaboration.
          </p>
          <p className="text-sm text-text-muted">
            Support:{" "}
            <a
              href={getSupportMailto(site.supportEmail)}
              className="font-medium text-brand-ink underline"
            >
              {site.supportEmail}
            </a>
          </p>
        </div>

        {footerSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-sm font-semibold text-text-strong">
              {section.title}
            </h2>
            <ul className="space-y-2 text-sm text-text-muted">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    className="transition-colors hover:text-brand-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
