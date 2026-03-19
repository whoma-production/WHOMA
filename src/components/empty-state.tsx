import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel: string;
  onCta?: () => void;
  footer?: ReactNode;
}

export function EmptyState({ title, description, ctaLabel, onCta, footer }: EmptyStateProps): JSX.Element {
  return (
    <Card className="relative overflow-hidden border-dashed">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-6xl font-semibold text-brand-ink/5">
        ∞
      </div>
      <div className="relative max-w-xl space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-text-strong">{title}</h3>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onCta}>{ctaLabel}</Button>
          {footer}
        </div>
      </div>
    </Card>
  );
}
