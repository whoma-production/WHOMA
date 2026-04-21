import type { HTMLAttributes } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InlineToast({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-line bg-surface-0 p-3",
        className
      )}
      role="status"
      aria-live="polite"
      {...props}
    />
  );
}

export function InlineToastLabel({ children }: { children: string }): JSX.Element {
  return <Badge variant="accent">{children}</Badge>;
}
