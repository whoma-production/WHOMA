import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-line bg-surface-1 text-text-strong",
        accent: "border-transparent bg-brand-accent/10 text-brand-ink",
        success: "border-transparent bg-state-success/10 text-state-success",
        warning: "border-transparent bg-state-warning/10 text-state-warning",
        danger: "border-transparent bg-state-danger/10 text-state-danger"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
