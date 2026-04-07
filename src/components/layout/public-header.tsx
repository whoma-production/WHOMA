import Link from "next/link";
import type { Route } from "next";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import {
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF,
  PUBLIC_COLLABORATION_PILOT_HREF,
  getPublicSiteConfig
} from "@/lib/public-site";
import { cn } from "@/lib/utils";

interface PublicHeaderProps {
  showNav?: boolean;
  primaryHref?: Route;
  primaryLabel?: string;
  secondaryHref?: Route;
  secondaryLabel?: string;
}

export function PublicHeader({
  showNav = true,
  primaryHref = PUBLIC_AGENT_CTA_HREF,
  primaryLabel = "Build your verified profile",
  secondaryHref = "/sign-in",
  secondaryLabel = "Sign in"
}: PublicHeaderProps): JSX.Element {
  const site = getPublicSiteConfig();

  return (
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
              Platform
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
            <Link
              href={PUBLIC_COLLABORATION_PILOT_HREF}
              className="transition-colors hover:text-text-strong"
            >
              Support
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
  );
}
