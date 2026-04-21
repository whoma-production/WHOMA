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
    <Card className="border-dashed bg-surface-0">
      <div className="max-w-xl space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Nothing here yet
          </p>
          <h3 className="mt-2 text-lg font-semibold text-text-strong">{title}</h3>
          <p className="mt-2 text-sm text-text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onCta}>{ctaLabel}</Button>
          {footer}
        </div>
      </div>
    </Card>
  );
}
