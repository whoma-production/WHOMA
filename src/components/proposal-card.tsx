import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatGBP } from "@/lib/currency";

export interface ProposalCardModel {
  agentName: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  feeModel: string;
  feeValue: number;
  timelineDays: number;
  inclusions: string[];
  marketingPlan: string;
  cancellationTerms: string;
}

function badgeVariant(
  status: ProposalCardModel["verificationStatus"]
): "default" | "warning" | "success" | "danger" {
  if (status === "VERIFIED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "danger";
  return "default";
}

export function ProposalCard({ proposal, title = "Proposal Preview" }: { proposal: ProposalCardModel; title?: string }): JSX.Element {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{title}</p>
          <h3 className="mt-1 text-lg">{proposal.agentName}</h3>
        </div>
        <Badge variant={badgeVariant(proposal.verificationStatus)}>{proposal.verificationStatus}</Badge>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Fee</dt>
          <dd className="text-sm text-text-strong">{proposal.feeModel === "PERCENT" ? `${proposal.feeValue}%` : formatGBP(proposal.feeValue)} ({proposal.feeModel})</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Timeline</dt>
          <dd className="text-sm text-text-strong">{proposal.timelineDays} days</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Inclusions</dt>
          <dd className="text-sm text-text-base">{proposal.inclusions.join(", ")}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Marketing plan</dt>
          <dd className="text-sm text-text-base">{proposal.marketingPlan}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Cancellation terms</dt>
          <dd className="text-sm text-text-base">{proposal.cancellationTerms}</dd>
        </div>
      </dl>
    </Card>
  );
}
