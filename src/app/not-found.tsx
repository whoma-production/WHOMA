import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound(): JSX.Element {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-1 px-4 py-10">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="flex justify-center">
          <Logo compact={false} />
        </div>

        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Page not found
          </p>
          <h1 className="text-4xl">This page is no longer available.</h1>
          <p className="mx-auto max-w-xl text-sm text-text-muted sm:text-base">
            The link may be out of date, or the page may have moved. You can
            return to the main site, browse verified agents, or contact support.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "primary" }))}>
              Back to home
            </Link>
            <Link
              href="/agents"
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              Browse agents
            </Link>
            <Link
              href="/contact"
              className={cn(buttonVariants({ variant: "tertiary" }))}
            >
              Contact support
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
