import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomeownerInstructionsIndexPage(): JSX.Element {
  return (
    <AppShell role="HOMEOWNER" title="My Instructions">
      <EmptyState
        title="No live instructions yet"
        description="Create your first instruction to start a time-boxed bid window and receive structured agent proposals."
        ctaLabel="Create Instruction"
        footer={
          <Link href="/homeowner/instructions/demo/compare" className={cn(buttonVariants({ variant: "secondary" }))}>
            Preview compare screen
          </Link>
        }
      />
    </AppShell>
  );
}
