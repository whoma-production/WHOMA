import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatGBP } from "@/lib/currency";

export type VerificationBadge = "UNVERIFIED" | "PENDING" | "VERIFIED";
export type ProposalDecisionAction = "SHORTLIST" | "REJECT" | "AWARD";

export interface ComparableProposal {
  id: string;
  agentName: string;
  verificationStatus: VerificationBadge;
  yearsExperience?: number | null;
  serviceAreas?: string[];
  feeModel: "FIXED" | "PERCENT" | "HYBRID" | "SUCCESS_BANDS";
  feeValue: number;
  inclusions: string[];
  timelineDays: number;
  marketingPlanSnippet: string;
  cancellationTermsSnippet: string;
  status: "SUBMITTED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED";
}

interface ProposalCompareTableProps {
  proposals: ComparableProposal[];
  onDecision?: (proposalId: string, action: ProposalDecisionAction) => void | Promise<void>;
  pendingProposalId?: string | null;
  highlightBadgesByProposalId?: Record<string, string[]>;
}

function verificationVariant(status: VerificationBadge): "success" | "warning" | "default" {
  if (status === "VERIFIED") return "success";
  if (status === "PENDING") return "warning";
  return "default";
}

function proposalStatusVariant(status: ComparableProposal["status"]): "default" | "accent" | "success" | "warning" | "danger" {
  if (status === "SHORTLISTED") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "ACCEPTED") return "accent";

  return "default";
}

function proposalStatusLabel(status: ComparableProposal["status"]): string {
  if (status === "SHORTLISTED") return "Shortlisted";
  if (status === "REJECTED") return "Rejected";
  if (status === "ACCEPTED") return "Chosen";

  return "Submitted";
}

function formatFeeModelLabel(value: ComparableProposal["feeModel"]): string {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatFeeSummary(proposal: ComparableProposal): string {
  if (proposal.feeModel === "PERCENT") {
    return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(proposal.feeValue)}%`;
  }

  return formatGBP(proposal.feeValue);
}

function formatInclusions(proposal: ComparableProposal): string {
  return proposal.inclusions.length > 0 ? proposal.inclusions.join(", ") : "Not specified";
}

function formatServiceAreas(proposal: ComparableProposal): string {
  const areas = proposal.serviceAreas?.filter((value) => value.trim().length > 0) ?? [];
  return areas.length > 0 ? areas.join(", ") : "Not specified";
}

function formatExperience(proposal: ComparableProposal): string {
  if (proposal.yearsExperience === null || proposal.yearsExperience === undefined) {
    return "Not specified";
  }

  return `${proposal.yearsExperience} ${proposal.yearsExperience === 1 ? "year" : "years"}`;
}

function isDecisionLocked(status: ComparableProposal["status"]): boolean {
  return status === "REJECTED" || status === "ACCEPTED";
}

export function ProposalCompareTable({
  proposals,
  onDecision,
  pendingProposalId,
  highlightBadgesByProposalId
}: ProposalCompareTableProps): JSX.Element {
  if (proposals.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-muted">
          No offers yet. Share the sale request and wait for agent offers to arrive.
        </p>
      </Card>
    );
  }

  const actionsDisabled = !onDecision || pendingProposalId !== null;

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface-0 shadow-soft" data-testid="proposal-compare-table">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-surface-1 text-text-muted">
            <th scope="col" className="sticky left-0 z-10 bg-surface-1 px-4 py-3 font-medium">
              Field
            </th>
            {proposals.map((proposal) => {
              const highlightBadges = highlightBadgesByProposalId?.[proposal.id] ?? [];

              return (
                <th
                  key={proposal.id}
                  scope="col"
                  className="min-w-72 border-l border-line px-4 py-3 align-top"
                  data-proposal-column-id={proposal.id}
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-text-strong">{proposal.agentName}</p>
                    <Badge variant={verificationVariant(proposal.verificationStatus)}>
                      {proposal.verificationStatus === "VERIFIED"
                        ? "Verified profile"
                        : proposal.verificationStatus === "PENDING"
                          ? "Verification pending"
                          : "Unverified"}
                    </Badge>
                    {highlightBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {highlightBadges.map((label) => (
                          <Badge key={`${proposal.id}-${label}`} variant="accent">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr data-row="proposal-status">
            <th scope="row" className="sticky left-0 z-10 border-t border-line bg-surface-0 px-4 py-4 font-medium text-text-strong">
              Status
            </th>
            {proposals.map((proposal) => (
              <td key={`${proposal.id}-status`} className="border-l border-t border-line px-4 py-4 align-top text-text-base">
                <Badge
                  variant={proposalStatusVariant(proposal.status)}
                  data-testid="proposal-status-badge"
                  data-proposal-id={proposal.id}
                  data-proposal-status={proposal.status}
                >
                  {proposalStatusLabel(proposal.status)}
                </Badge>
              </td>
            ))}
          </tr>
          <CompareRow label="Headline fee" values={proposals.map((p) => formatFeeSummary(p))} />
          <CompareRow label="Fee model" values={proposals.map((p) => formatFeeModelLabel(p.feeModel))} />
          <CompareRow label="Services included" values={proposals.map((p) => formatInclusions(p))} />
          <CompareRow label="Local coverage" values={proposals.map((p) => formatServiceAreas(p))} />
          <CompareRow label="Experience" values={proposals.map((p) => formatExperience(p))} />
          <CompareRow label="Timeline estimate" values={proposals.map((p) => `${p.timelineDays} days`)} />
          <CompareRow label="Marketing plan" values={proposals.map((p) => p.marketingPlanSnippet)} />
          <CompareRow label="Cancellation terms" values={proposals.map((p) => p.cancellationTermsSnippet)} />
          <tr>
            <th scope="row" className="sticky left-0 z-10 border-t border-line bg-surface-0 px-4 py-4 font-medium text-text-strong">
              Actions
            </th>
            {proposals.map((proposal) => {
              const locked = actionsDisabled || isDecisionLocked(proposal.status);
              const shortlisted = proposal.status === "SHORTLISTED";
              const accepted = proposal.status === "ACCEPTED";
              const rejected = proposal.status === "REJECTED";

              return (
                <td key={`${proposal.id}-actions`} className="border-l border-t border-line px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={shortlisted ? "secondary" : "primary"}
                      disabled={locked || shortlisted || rejected || accepted}
                      data-testid="proposal-decision-button"
                      data-proposal-id={proposal.id}
                      data-decision-action="SHORTLIST"
                      onClick={() => {
                        void onDecision?.(proposal.id, "SHORTLIST");
                      }}
                    >
                      {shortlisted ? "Shortlisted" : "Shortlist"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={locked || rejected || accepted}
                      data-testid="proposal-decision-button"
                      data-proposal-id={proposal.id}
                      data-decision-action="REJECT"
                      onClick={() => {
                        void onDecision?.(proposal.id, "REJECT");
                      }}
                    >
                      {rejected ? "Rejected" : "Reject"}
                    </Button>
                    <Button
                      size="sm"
                      variant={accepted ? "secondary" : "tertiary"}
                      disabled={locked || accepted}
                      data-testid="proposal-decision-button"
                      data-proposal-id={proposal.id}
                      data-decision-action="AWARD"
                      onClick={() => {
                        void onDecision?.(proposal.id, "AWARD");
                      }}
                    >
                      {accepted ? "Chosen" : "Choose agent"}
                    </Button>
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: ReactNode[] }): JSX.Element {
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 border-t border-line bg-surface-0 px-4 py-4 font-medium text-text-strong">
        {label}
      </th>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="border-l border-t border-line px-4 py-4 align-top text-text-base">
          {value}
        </td>
      ))}
    </tr>
  );
}
