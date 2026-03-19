import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const footerSections = [
  {
    title: "Whoma",
    links: [
      { href: "/locations", label: "Browse Instructions" },
      { href: "/sitemap", label: "Sitemap" }
    ]
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/cookies", label: "Cookies" },
      { href: "/terms", label: "Terms" }
    ]
  },
  {
    title: "Support",
    links: [
      { href: "/complaints", label: "Complaints" },
      { href: "/contact", label: "Contact" }
    ]
  }
] as const;

export function PublicFooter(): JSX.Element {
  return (
    <footer className="border-t border-line bg-surface-0">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:px-8">
        <div className="space-y-3">
          <Logo subtitle="Where Home Owners Meet Agents" />
          <p className="max-w-sm text-sm text-text-muted">
            Whoma is a tender marketplace for home sellers to compare structured estate agent proposals.
          </p>
          <p className="text-xs text-text-muted">UK MVP legal and policy pages are placeholders pending legal review before launch.</p>
        </div>

        {footerSections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className="text-sm font-semibold text-text-strong">{section.title}</h2>
            <ul className="space-y-2 text-sm text-text-muted">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-brand-ink">
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
