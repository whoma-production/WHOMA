import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

interface LogoProps {
  href?: Route;
  className?: string;
  compact?: boolean;
  subtitle?: string;
}

export function Logo({
  href = "/" as Route,
  className,
  compact = false,
  subtitle
}: LogoProps): JSX.Element {
  const mark = (
    <span aria-hidden="true" className="inline-flex items-center text-brand-accent">
      <span className="text-xl font-semibold leading-none">∞</span>
    </span>
  );

  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {mark}
      {!compact ? (
        <span className="flex items-baseline gap-3 leading-none">
          <span className="text-sm font-semibold tracking-[0.12em] text-brand-ink">
            WHOMA
          </span>
          {subtitle ? (
            <span className="hidden text-[0.72rem] font-medium text-text-muted sm:inline">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  return (
    <Link
      href={href}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
    >
      {content}
      <span className="sr-only">WHOMA home</span>
    </Link>
  );
}
