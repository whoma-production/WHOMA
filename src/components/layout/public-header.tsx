import Link from "next/link";
import type { Route } from "next";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import {
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_FAQS_HREF,
  PUBLIC_SUPPORT_HREF,
  getPublicSiteConfig
} from "@/lib/public-site";
import { cn } from "@/lib/utils";

interface PublicHeaderProps {
  showNav?: boolean;
  showUtilityStrip?: boolean;
  primaryHref?: Route;
  primaryLabel?: string;
  secondaryHref?: Route;
  secondaryLabel?: string;
}

export function PublicHeader({
  showNav = true,
  showUtilityStrip = showNav,
  primaryHref = PUBLIC_AGENT_CTA_HREF,
  primaryLabel = "Build your verified profile",
  secondaryHref = "/sign-in",
  secondaryLabel = "Sign in"
}: PublicHeaderProps): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <>
      {showUtilityStrip ? (
        <div className="border-b border-line bg-surface-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
            <nav
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-medium text-text-muted sm:justify-end sm:gap-5"
              aria-label="Utility"
            >
              <Link
                href={PUBLIC_AGENT_CTA_HREF}
                className="transition-colors hover:text-text-strong"
              >
                Create profile
              </Link>
              <Link
                href={PUBLIC_FAQS_HREF}
                className="transition-colors hover:text-text-strong"
              >
                FAQs
              </Link>
              <Link
                href={PUBLIC_SUPPORT_HREF}
                className="transition-colors hover:text-text-strong"
              >
                Support
              </Link>
            </nav>
          </div>
        </div>
      ) : null}

      <header className="border-b border-line bg-surface-1">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Logo subtitle={site.logoSubtitle} />

          {showNav ? (
            <nav
              className="hidden items-center gap-6 text-sm text-text-muted lg:flex"
              aria-label="Primary"
            >
              <Link
                href="/#platform"
                className="transition-colors hover:text-text-strong"
              >
                Proof infrastructure
              </Link>
              <Link
                href="/#how-it-works"
                className="transition-colors hover:text-text-strong"
              >
                How it works
              </Link>
              <Link
                href={PUBLIC_AGENT_DIRECTORY_HREF}
                className="transition-colors hover:text-text-strong"
              >
                Agents
              </Link>
            </nav>
          ) : null}

          <div className="flex items-center gap-2">
            <Link
              href={secondaryHref}
              className={cn(buttonVariants({ variant: "secondary", size: "md" }))}
            >
              {secondaryLabel}
            </Link>
            <Link
              href={primaryHref}
              className={cn(buttonVariants({ variant: "primary", size: "md" }))}
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
