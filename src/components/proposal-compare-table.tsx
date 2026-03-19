import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatGBP } from "@/lib/currency";

export type VerificationBadge = "UNVERIFIED" | "PENDING" | "VERIFIED";

export interface ComparableProposal {
  id: string;
  agentName: string;
  verificationStatus: VerificationBadge;
  feeModel: "FIXED" | "PERCENT" | "HYBRID" | "SUCCESS_BANDS";
  feeValue: number;
  inclusions: string[];
  timelineDays: number;
  marketingPlanSnippet: string;
  cancellationTermsSnippet: string;
  status: "SUBMITTED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED";
}

function verificationVariant(status: VerificationBadge): "success" | "warning" | "default" {
  if (status === "VERIFIED") return "success";
  if (status === "PENDING") return "warning";
  return "default";
}

function formatFeeSummary(proposal: ComparableProposal): string {
  if (proposal.feeModel === "PERCENT") {
    return `${proposal.feeValue}%`;
  }

  return formatGBP(proposal.feeValue);
}

export function ProposalCompareTable({ proposals }: { proposals: ComparableProposal[] }): JSX.Element {
  if (proposals.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-muted">
          No proposals yet. Share the instruction and wait for the bid window to attract responses.
        </p>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface-0 shadow-soft">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-surface-1 text-text-muted">
            <th scope="col" className="sticky left-0 z-10 bg-surface-1 px-4 py-3 font-medium">
              Field
            </th>
            {proposals.map((proposal) => (
              <th key={proposal.id} scope="col" className="min-w-72 border-l border-line px-4 py-3 align-top">
                <div className="space-y-2">
                  <p className="font-semibold text-text-strong">{proposal.agentName}</p>
                  <Badge variant={verificationVariant(proposal.verificationStatus)}>
                    {proposal.verificationStatus === "VERIFIED"
                      ? "Verified agent"
                      : proposal.verificationStatus === "PENDING"
                        ? "Verification pending"
                        : "Unverified"}
                  </Badge>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <CompareRow label="Total fee summary" values={proposals.map((p) => formatFeeSummary(p))} />
          <CompareRow label="Fee model" values={proposals.map((p) => p.feeModel)} />
          <CompareRow label="Inclusions" values={proposals.map((p) => p.inclusions.join(", "))} />
          <CompareRow label="Timeline days" values={proposals.map((p) => `${p.timelineDays} days`)} />
          <CompareRow label="Marketing plan" values={proposals.map((p) => p.marketingPlanSnippet)} />
          <CompareRow label="Cancellation terms" values={proposals.map((p) => p.cancellationTermsSnippet)} />
          <tr>
            <th scope="row" className="sticky left-0 z-10 border-t border-line bg-surface-0 px-4 py-4 font-medium text-text-strong">
              Actions
            </th>
            {proposals.map((proposal) => (
              <td key={`${proposal.id}-actions`} className="border-l border-t border-line px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={proposal.status === "SHORTLISTED" ? "secondary" : "primary"}>
                    {proposal.status === "SHORTLISTED" ? "Shortlisted" : "Shortlist"}
                  </Button>
                  <Button size="sm" variant="secondary">Reject</Button>
                  <Button size="sm" variant="tertiary">Award instruction</Button>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }): JSX.Element {
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 border-t border-line bg-surface-0 px-4 py-4 font-medium text-text-strong">
        {label}
      </th>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="border-l border-t border-line px-4 py-4 align-top text-text-base">
          <span>{value}</span>
        </td>
      ))}
    </tr>
  );
}
