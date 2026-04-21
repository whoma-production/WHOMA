import Link from "next/link";

import { CountdownTimer } from "@/components/countdown-timer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface InstructionCardModel {
  id: string;
  postcodeDistrict: string;
  city: string;
  propertyType: string;
  bedrooms: number;
  sellerTimelineGoal: string;
  proposalsCount: number;
  bidWindowEndAtIso: string;
}

interface InstructionCardProps {
  instruction: InstructionCardModel;
  mode?: "agent" | "public";
}

export function InstructionCard({
  instruction,
  mode = "agent"
}: InstructionCardProps): JSX.Element {
  const isPublic = mode === "public";

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">
            {instruction.city} · {instruction.postcodeDistrict}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text-strong">
            {instruction.propertyType} · {instruction.bedrooms} bed
          </h3>
        </div>
        <CountdownTimer endAtIso={instruction.bidWindowEndAtIso} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>
          {instruction.proposalsCount} {isPublic ? "responses" : "offers"}
        </Badge>
        <Badge variant="accent">{instruction.sellerTimelineGoal}</Badge>
        {isPublic ? <Badge variant="warning">Access by invitation</Badge> : null}
      </div>

      {isPublic ? (
        <p className="text-sm text-text-muted">
          Detailed instruction access is opened selectively once seller access is
          approved.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/agent/marketplace/${instruction.id}/proposal`}
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Submit offer
          </Link>
          <Link
            href={`/agent/marketplace/${instruction.id}`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            View instruction
          </Link>
        </div>
      )}
    </Card>
  );
}
