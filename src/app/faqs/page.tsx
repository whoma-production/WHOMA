import Link from "next/link";
import type { Metadata, Route } from "next";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { buttonVariants } from "@/components/ui/button";
import { PUBLIC_FAQ_CATEGORIES } from "@/lib/faqs";
import {
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_SUPPORT_HREF,
  getPublicSiteConfig
} from "@/lib/public-site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "WHOMA | FAQs",
  description:
    "Frequently asked questions about WHOMA profiles, verification, sharing, collaboration, sign-in, and support."
};

export const dynamic = "force-dynamic";

export default function FaqPage(): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />

      <main className="public-section">
        <div className="mx-auto w-full max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <section className="public-record space-y-5">
            <div className="space-y-3">
              <p className="public-kicker">FAQs</p>
              <h1>Frequently asked questions</h1>
              <p className="max-w-3xl text-sm text-text-muted sm:text-base">
                New to WHOMA? Start here. These answers explain how profiles,
                verification, sharing, and access work today.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {PUBLIC_FAQ_CATEGORIES.map((category) => (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="rounded-md border border-line bg-surface-0 px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text-strong"
                >
                  {category.title}
                </a>
              ))}
            </div>
          </section>

          <section className="grid gap-6">
            {PUBLIC_FAQ_CATEGORIES.map((category) => (
              <article
                key={category.id}
                id={category.id}
                className="public-record space-y-4 scroll-mt-24"
              >
                <h2 className="text-2xl">{category.title}</h2>

                <div className="space-y-3">
                  {category.items.map((item) => (
                    <details
                      key={item.id}
                      className="rounded-md border border-line bg-surface-1 px-4 py-3"
                    >
                      <summary className="cursor-pointer list-none pr-2 text-base font-semibold text-text-strong [&::-webkit-details-marker]:hidden">
                        {item.question}
                      </summary>
                      <p className="mt-3 border-t border-line pt-3 text-sm text-text-muted sm:text-base">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="public-record flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="public-kicker">Need more help?</p>
              <p className="max-w-xl text-sm text-text-muted sm:text-base">
                Contact {site.supportEmail} for account, profile, verification,
                or collaboration support.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={PUBLIC_SUPPORT_HREF as Route}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                Contact support
              </Link>
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                Create profile
              </Link>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
