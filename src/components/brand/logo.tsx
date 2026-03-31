import Link from "next/link";
import type { Route } from "next";

import { cn } from "@/lib/utils";

interface LogoProps {
  href?: Route;
  className?: string;
  compact?: boolean;
  subtitle?: string;
}

export function Logo({ href = "/", className, compact = false, subtitle }: LogoProps): JSX.Element {
  const mark = (
    <span aria-hidden="true" className="inline-flex items-center text-brand-accent">
      <span className="text-xl font-semibold leading-none">∞</span>
    </span>
  );

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-[0.18em] text-brand-ink">WHOMA</span>
          {subtitle ? (
            <span className="mt-0.5 text-[0.68rem] font-medium tracking-[0.04em] text-text-muted">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  return (
    <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
      {content}
      <span className="sr-only">WHOMA home</span>
    </Link>
  );
}
