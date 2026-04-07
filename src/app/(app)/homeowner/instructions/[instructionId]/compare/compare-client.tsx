"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { InlineToast, InlineToastLabel } from "@/components/ui/inline-toast";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProposalCompareTable, type ComparableProposal, type ProposalDecisionAction } from "@/components/proposal-compare-table";

export type InstructionCompareStatus = "DRAFT" | "LIVE" | "CLOSED" | "SHORTLIST" | "AWARDED";

type CompareSortKey =
  | "BEST_VALUE"
  | "LOWEST_FEE"
  | "MOST_COMPLETE_SERVICE"
  | "BEST_LOCAL_FIT"
  | "FASTEST_TIMELINE";

export interface CompareInstructionData {
  instruction: {
    id: string;
    addressLine1: string;
    city: string;
    postcode: string;
    propertyType: string;
    bedrooms: number;
    sellerGoals: string;
    targetTimeline: string;
    status: InstructionCompareStatus;
    bidWindowStartAt: string;
    bidWindowEndAt: string;
  };
  proposals: ComparableProposal[];
}

interface ToastState {
  kind: "success" | "error";
  title: string;
  message: string;
}

const londonDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London"
});

const sortOptions: Array<{ key: CompareSortKey; label: string; description: string }> = [
  {
    key: "BEST_VALUE",
    label: "Best value",
    description: "Balance fee, service completeness, and local fit."
  },
  {
    key: "LOWEST_FEE",
    label: "Lowest fee",
    description: "Prioritize the lowest headline fee first."
  },
  {
    key: "MOST_COMPLETE_SERVICE",
    label: "Most complete service",
    description: "Prioritize offers with stronger included service detail."
  },
  {
    key: "BEST_LOCAL_FIT",
    label: "Best local fit",
    description: "Prioritize verified local experience and area fit signals."
  },
  {
    key: "FASTEST_TIMELINE",
    label: "Fastest timeline",
    description: "Prioritize agents with the quickest route to market."
  }
];

function formatStatusLabel(status: InstructionCompareStatus): string {
  if (status === "SHORTLIST") return "Shortlist in progress";
  if (status === "AWARDED") return "Chosen";
  if (status === "CLOSED") return "Closed";
  if (status === "LIVE") return "Open for offers";

  return "Draft";
}

function statusVariant(status: InstructionCompareStatus): "default" | "accent" | "success" | "warning" {
  if (status === "LIVE") return "accent";
  if (status === "SHORTLIST" || status === "AWARDED") return "success";
  if (status === "CLOSED") return "warning";

  return "default";
}

function formatPropertyType(propertyType: string): string {
  return propertyType
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatEnumLabel(value: string): string {
  if (value === "ASAP") {
    return "ASAP";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDecisionMessage(action: ProposalDecisionAction, agentName: string): string {
  if (action === "SHORTLIST") {
    return `${agentName} has been shortlisted.`;
  }

  if (action === "REJECT") {
    return `${agentName} has been declined.`;
  }

  return `${agentName} has been chosen.`;
}

function formatProposalStatusLabel(status: ComparableProposal["status"]): string {
  if (status === "SHORTLISTED") {
    return "Shortlisted";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  if (status === "ACCEPTED") {
    return "Chosen";
  }

  return "Submitted";
}

function getResponseMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidate = record.message ?? record.error ?? record.detail;

  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveDecisionRecord(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }

  const rootCandidate =
    isRecord(payload.data) ? payload.data : isRecord(payload.result) ? payload.result : payload;
  if (!isRecord(rootCandidate)) {
    return null;
  }

  if (isRecord(rootCandidate.decision)) {
    return rootCandidate.decision;
  }

  if (isRecord(rootCandidate.proposal) || isRecord(rootCandidate.instruction)) {
    return rootCandidate;
  }

  return null;
}

function extractUpdatedProposal(payload: unknown, proposalId: string): Partial<ComparableProposal> | null {
  const decisionRecord = resolveDecisionRecord(payload);
  if (!decisionRecord) {
    return null;
  }

  const nestedProposal = decisionRecord.proposal;
  const resolvedRecord = isRecord(nestedProposal) ? nestedProposal : decisionRecord;

  if (typeof resolvedRecord.id !== "string" && typeof resolvedRecord.proposalId !== "string") {
    return null;
  }

  const resolvedId = typeof resolvedRecord.id === "string" ? resolvedRecord.id : resolvedRecord.proposalId;

  if (resolvedId !== proposalId) {
    return null;
  }

  const update: Partial<ComparableProposal> = {
    id: resolvedId
  };

  if (typeof resolvedRecord.status === "string") {
    update.status = resolvedRecord.status as ComparableProposal["status"];
  }

  return update;
}

function extractUpdatedInstructionStatus(payload: unknown): InstructionCompareStatus | null {
  const decisionRecord = resolveDecisionRecord(payload);
  if (!decisionRecord) {
    return null;
  }

  const nestedInstruction = decisionRecord.instruction;
  if (!isRecord(nestedInstruction) || typeof nestedInstruction.status !== "string") {
    return null;
  }

  return nestedInstruction.status as InstructionCompareStatus;
}

function mapOptimisticStatus(action: ProposalDecisionAction): ComparableProposal["status"] {
  if (action === "SHORTLIST") return "SHORTLISTED";
  if (action === "REJECT") return "REJECTED";
  return "ACCEPTED";
}

function mapOptimisticInstructionStatus(
  action: ProposalDecisionAction,
  currentStatus: InstructionCompareStatus
): InstructionCompareStatus {
  if (action === "AWARD") {
    return "AWARDED";
  }

  if (action === "SHORTLIST" && currentStatus !== "AWARDED") {
    return "SHORTLIST";
  }

  return currentStatus;
}

function hasUnlockedMessagingThreads(proposals: ComparableProposal[]): boolean {
  return proposals.some((proposal) => proposal.status === "SHORTLISTED" || proposal.status === "ACCEPTED");
}

function extractPostcodeDistrict(postcode: string): string | null {
  const normalized = postcode.toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^[A-Z]{1,2}\d[A-Z\d]?/);
  return match ? match[0] : null;
}

function normalizeFeeForSort(proposal: ComparableProposal): number {
  if (proposal.feeModel === "PERCENT") {
    return proposal.feeValue * 1000;
  }

  return proposal.feeValue;
}

function serviceCompletenessScore(proposal: ComparableProposal): number {
  const inclusionScore = proposal.inclusions.length;
  const marketingScore = proposal.marketingPlanSnippet.length > 90 ? 1 : 0;
  const termsScore = proposal.cancellationTermsSnippet.length > 70 ? 1 : 0;
  const verificationScore = proposal.verificationStatus === "VERIFIED" ? 1 : 0;

  return inclusionScore + marketingScore + termsScore + verificationScore;
}

function localFitScore(proposal: ComparableProposal, postcodeDistrict: string | null): number {
  const serviceAreas = proposal.serviceAreas ?? [];
  const hasDistrictMatch =
    postcodeDistrict !== null && serviceAreas.some((value) => value.toUpperCase() === postcodeDistrict);

  const districtScore = hasDistrictMatch ? 3 : 0;
  const verificationScore =
    proposal.verificationStatus === "VERIFIED" ? 2 : proposal.verificationStatus === "PENDING" ? 1 : 0;
  const experienceScore = proposal.yearsExperience ? Math.min(proposal.yearsExperience / 4, 3) : 0;

  return districtScore + verificationScore + experienceScore;
}

function bestValueScore(
  proposal: ComparableProposal,
  postcodeDistrict: string | null
): number {
  const feePenalty = normalizeFeeForSort(proposal) / 1200;
  const completeness = serviceCompletenessScore(proposal) * 1.8;
  const localFit = localFitScore(proposal, postcodeDistrict) * 1.6;
  const timelineFactor = proposal.timelineDays / 30;

  return completeness + localFit - feePenalty - timelineFactor;
}

function scoreProposal(
  proposal: ComparableProposal,
  postcodeDistrict: string | null
): {
  normalizedFee: number;
  completeness: number;
  localFit: number;
  value: number;
} {
  const normalizedFee = normalizeFeeForSort(proposal);
  const completeness = serviceCompletenessScore(proposal);
  const localFit = localFitScore(proposal, postcodeDistrict);
  const value = bestValueScore(proposal, postcodeDistrict);

  return { normalizedFee, completeness, localFit, value };
}

function sortProposals(
  proposals: ComparableProposal[],
  sortBy: CompareSortKey,
  postcodeDistrict: string | null
): ComparableProposal[] {
  const scored = proposals.map((proposal) => ({
    proposal,
    score: scoreProposal(proposal, postcodeDistrict)
  }));

  scored.sort((left, right) => {
    if (sortBy === "LOWEST_FEE") {
      return left.score.normalizedFee - right.score.normalizedFee;
    }

    if (sortBy === "MOST_COMPLETE_SERVICE") {
      return right.score.completeness - left.score.completeness;
    }

    if (sortBy === "BEST_LOCAL_FIT") {
      return right.score.localFit - left.score.localFit;
    }

    if (sortBy === "FASTEST_TIMELINE") {
      return left.proposal.timelineDays - right.proposal.timelineDays;
    }

    return right.score.value - left.score.value;
  });

  return scored.map((item) => item.proposal);
}

function buildHighlightBadges(
  proposals: ComparableProposal[],
  postcodeDistrict: string | null
): Record<string, string[]> {
  if (proposals.length === 0) {
    return {};
  }

  const scored = proposals.map((proposal) => ({
    proposal,
    score: scoreProposal(proposal, postcodeDistrict)
  }));

  const lowestFee = Math.min(...scored.map((item) => item.score.normalizedFee));
  const fastestTimeline = Math.min(...scored.map((item) => item.proposal.timelineDays));
  const mostComplete = Math.max(...scored.map((item) => item.score.completeness));
  const bestLocal = Math.max(...scored.map((item) => item.score.localFit));
  const bestValue = Math.max(...scored.map((item) => item.score.value));

  const badges: Record<string, string[]> = {};

  for (const item of scored) {
    const labels: string[] = [];

    if (item.score.normalizedFee === lowestFee) {
      labels.push("Lowest fee");
    }

    if (item.proposal.timelineDays === fastestTimeline) {
      labels.push("Fastest to market");
    }

    if (item.score.completeness === mostComplete) {
      labels.push("Most complete service");
    }

    if (item.score.localFit === bestLocal) {
      labels.push("Best local fit");
    }

    if (item.score.value === bestValue) {
      labels.push("Top value");
    }

    badges[item.proposal.id] = labels;
  }

  return badges;
}

function formatSpotlightFee(proposal: ComparableProposal): string {
  if (proposal.feeModel === "PERCENT") {
    return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(proposal.feeValue)}%`;
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(proposal.feeValue);
}

function buildDecisionSpotlights(
  proposals: ComparableProposal[],
  postcodeDistrict: string | null
): Array<{ label: string; agentName: string; detail: string }> {
  if (proposals.length === 0) {
    return [];
  }

  const scored = proposals.map((proposal) => ({
    proposal,
    score: scoreProposal(proposal, postcodeDistrict)
  }));

  const lowestFee = [...scored].sort((left, right) => left.score.normalizedFee - right.score.normalizedFee)[0]!;
  const fastestTimeline = [...scored].sort((left, right) => left.proposal.timelineDays - right.proposal.timelineDays)[0]!;
  const mostComplete = [...scored].sort((left, right) => right.score.completeness - left.score.completeness)[0]!;
  const bestLocal = [...scored].sort((left, right) => right.score.localFit - left.score.localFit)[0]!;
  const bestValue = [...scored].sort((left, right) => right.score.value - left.score.value)[0]!;

  return [
    {
      label: "Top value",
      agentName: bestValue.proposal.agentName,
      detail: `${formatSpotlightFee(bestValue.proposal)} · ${bestValue.proposal.timelineDays} days`
    },
    {
      label: "Lowest fee",
      agentName: lowestFee.proposal.agentName,
      detail: formatSpotlightFee(lowestFee.proposal)
    },
    {
      label: "Most complete service",
      agentName: mostComplete.proposal.agentName,
      detail: `${mostComplete.proposal.inclusions.length} listed services`
    },
    {
      label: "Best local fit",
      agentName: bestLocal.proposal.agentName,
      detail: bestLocal.proposal.serviceAreas?.slice(0, 2).join(", ") || "Coverage not listed"
    },
    {
      label: "Fastest to market",
      agentName: fastestTimeline.proposal.agentName,
      detail: `${fastestTimeline.proposal.timelineDays} day timeline`
    }
  ];
}

export function CompareClient({ initialData }: { initialData: CompareInstructionData }): JSX.Element {
  const router = useRouter();
  const [proposals, setProposals] = useState(initialData.proposals);
  const [instructionStatus, setInstructionStatus] = useState(initialData.instruction.status);
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sortBy, setSortBy] = useState<CompareSortKey>("BEST_VALUE");
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const proposalsRef = useRef(initialData.proposals);
  const instructionStatusRef = useRef(initialData.instruction.status);

  useEffect(() => {
    proposalsRef.current = proposals;
  }, [proposals]);

  useEffect(() => {
    instructionStatusRef.current = instructionStatus;
  }, [instructionStatus]);

  const instruction = initialData.instruction;
  const postcodeDistrict = useMemo(
    () => extractPostcodeDistrict(instruction.postcode),
    [instruction.postcode]
  );
  const sortedProposals = useMemo(
    () => sortProposals(proposals, sortBy, postcodeDistrict),
    [proposals, sortBy, postcodeDistrict]
  );
  const highlightBadgesByProposalId = useMemo(
    () => buildHighlightBadges(proposals, postcodeDistrict),
    [proposals, postcodeDistrict]
  );
  const decisionSpotlights = useMemo(
    () => buildDecisionSpotlights(proposals, postcodeDistrict),
    [proposals, postcodeDistrict]
  );

  const windowStart = useMemo(() => new Date(instruction.bidWindowStartAt), [instruction.bidWindowStartAt]);
  const windowEnd = useMemo(() => new Date(instruction.bidWindowEndAt), [instruction.bidWindowEndAt]);
  const now = new Date();

  const windowOpen = instructionStatus === "LIVE" && windowStart <= now && now < windowEnd;
  const summaryStatusLabel =
    windowOpen
      ? "Offer window open"
      : instructionStatus === "AWARDED"
        ? "Agent chosen"
        : instructionStatus === "SHORTLIST"
          ? "Shortlist in progress"
        : instructionStatus === "CLOSED"
          ? "Offer window closed"
          : "Draft request";

  const messagingUnlocked = hasUnlockedMessagingThreads(proposals);
  const messagingStateLabel = messagingUnlocked ? "OPEN" : "LOCKED";

  const shortlistedProposals = proposals.filter(
    (proposal) => proposal.status === "SHORTLISTED" || proposal.status === "ACCEPTED"
  );

  const selectedSubmittableProposals = selectedProposalIds.filter((proposalId) => {
    const proposal = proposals.find((item) => item.id === proposalId);
    return proposal?.status === "SUBMITTED";
  });

  const activeSort = sortOptions.find((option) => option.key === sortBy) ?? sortOptions[0]!;

  async function applyDecision(
    proposalId: string,
    action: ProposalDecisionAction,
    options?: { suppressToast?: boolean }
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const currentProposals = proposalsRef.current;
    const currentInstructionStatus = instructionStatusRef.current;
    const proposal = currentProposals.find((item) => item.id === proposalId);

    if (!proposal) {
      const message = "That offer is no longer available.";
      if (!options?.suppressToast) {
        setToast({
          kind: "error",
          title: "Decision failed",
          message
        });
      }
      return { ok: false, message };
    }

    const previousProposals = currentProposals;
    const previousInstructionStatus = currentInstructionStatus;
    const optimisticStatus = mapOptimisticStatus(action);
    const optimisticInstructionStatus = mapOptimisticInstructionStatus(action, currentInstructionStatus);

    setPendingProposalId(proposalId);
    if (!options?.suppressToast) {
      setToast(null);
    }
    instructionStatusRef.current = optimisticInstructionStatus;
    setInstructionStatus(optimisticInstructionStatus);
    setSelectedProposalIds((current) => current.filter((id) => id !== proposalId));
    setProposals((current) => {
      const next = current.map((item) =>
        item.id === proposalId ? { ...item, status: optimisticStatus } : item
      );
      proposalsRef.current = next;
      return next;
    });

    try {
      const response = await fetch(`/api/proposals/${proposalId}/decision`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": globalThis.crypto?.randomUUID?.() ?? `${proposalId}-${action}-${Date.now()}`
        },
        body: JSON.stringify({ action })
      });

      const rawBody = await response.text();
      let parsedBody: unknown = null;

      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = rawBody;
        }
      }

      if (!response.ok) {
        throw new Error(getResponseMessage(parsedBody) ?? `Decision request failed with status ${response.status}.`);
      }

      const updatedProposal = extractUpdatedProposal(parsedBody, proposalId);
      const updatedInstructionStatus = extractUpdatedInstructionStatus(parsedBody);

      if (updatedProposal?.status) {
        setProposals((current) => {
          const next = current.map((item) =>
            item.id === proposalId
              ? { ...item, status: updatedProposal.status ?? optimisticStatus }
              : item
          );
          proposalsRef.current = next;
          return next;
        });
      }

      if (updatedInstructionStatus) {
        instructionStatusRef.current = updatedInstructionStatus;
        setInstructionStatus(updatedInstructionStatus);
      }

      if (!options?.suppressToast) {
        setToast({
          kind: "success",
          title: "Decision saved",
          message: formatDecisionMessage(action, proposal.agentName)
        });
      }

      return { ok: true };
    } catch (error) {
      proposalsRef.current = previousProposals;
      setProposals(previousProposals);
      instructionStatusRef.current = previousInstructionStatus;
      setInstructionStatus(previousInstructionStatus);

      const message = error instanceof Error ? error.message : "Please try again.";

      if (!options?.suppressToast) {
        setToast({
          kind: "error",
          title: "Could not save decision",
          message
        });
      }

      return { ok: false, message };
    } finally {
      setPendingProposalId(null);
    }
  }

  async function handleDecision(proposalId: string, action: ProposalDecisionAction): Promise<void> {
    await applyDecision(proposalId, action);
  }

  async function handleShortlistSelected(): Promise<void> {
    const targetIds = selectedSubmittableProposals.slice(0, 3);

    if (targetIds.length === 0) {
      setToast({
        kind: "error",
        title: "No offers selected",
        message: "Select up to three submitted offers to shortlist."
      });
      return;
    }

    setBatchPending(true);
    setToast(null);

    let successCount = 0;
    let failedCount = 0;

    for (const proposalId of targetIds) {
      const result = await applyDecision(proposalId, "SHORTLIST", { suppressToast: true });
      if (result.ok) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    }

    setBatchPending(false);
    setSelectedProposalIds([]);

    if (successCount > 0 && failedCount === 0) {
      setToast({
        kind: "success",
        title: "Shortlist updated",
        message: `${successCount} offer${successCount === 1 ? "" : "s"} shortlisted.`
      });
      return;
    }

    if (successCount > 0) {
      setToast({
        kind: "error",
        title: "Partial shortlist update",
        message: `${successCount} saved, ${failedCount} failed. Please retry the remaining offers.`
      });
      return;
    }

    setToast({
      kind: "error",
      title: "Could not shortlist offers",
      message: "Please retry in a moment."
    });
  }

  function toggleShortlistSelection(proposalId: string): void {
    const proposal = proposals.find((item) => item.id === proposalId);
    if (!proposal || proposal.status !== "SUBMITTED") {
      return;
    }

    setSelectedProposalIds((current) => {
      if (current.includes(proposalId)) {
        return current.filter((id) => id !== proposalId);
      }

      if (current.length >= 3) {
        setToast({
          kind: "error",
          title: "Selection limit reached",
          message: "Select up to three offers in your shortlist."
        });
        return current;
      }

      return [...current, proposalId];
    });
  }

  const shortlistActionsDisabled = pendingProposalId !== null || batchPending;

  if (proposals.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Sale request {instruction.id}</p>
              <h2 className="text-lg font-semibold text-text-strong">
                {instruction.addressLine1}, {instruction.city} {instruction.postcode}
              </h2>
              <p className="text-sm text-text-muted">
                {formatPropertyType(instruction.propertyType)} · {instruction.bedrooms} bedrooms · {instruction.sellerGoals}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={statusVariant(instructionStatus)}
                data-testid="instruction-status-badge"
                data-instruction-status={instructionStatus}
              >
                {formatStatusLabel(instructionStatus)}
              </Badge>
              <Badge variant="accent">{summaryStatusLabel}</Badge>
              <Badge
                variant={messagingUnlocked ? "success" : "warning"}
                data-testid="messaging-unlock-badge"
                data-messaging-state={messagingStateLabel}
              >
                Contact {messagingStateLabel}
              </Badge>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-text-strong">Seller goals</h3>
              <p className="text-sm text-text-muted">{instruction.sellerGoals}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-text-strong">Offer window</h3>
              <p className="text-sm text-text-muted">
                {londonDateTimeFormatter.format(windowStart)} - {londonDateTimeFormatter.format(windowEnd)}
              </p>
              <p className="text-sm text-text-muted">Target timeline: {formatEnumLabel(instruction.targetTimeline)}</p>
            </div>
          </div>
        </Card>

        {toast ? (
          <InlineToast className={toast.kind === "error" ? "border-state-danger/20 bg-state-danger/5" : "border-state-success/20 bg-state-success/5"}>
            <InlineToastLabel>{toast.kind === "error" ? "Error" : "Success"}</InlineToastLabel>
            <div className="space-y-1">
              <p className="font-medium text-text-strong">{toast.title}</p>
              <p className="text-sm text-text-muted">{toast.message}</p>
            </div>
          </InlineToast>
        ) : null}

        <EmptyState
          title="No offers yet"
          description="Your instruction is open. Offers usually arrive as local agents review it."
          ctaLabel="Back to instructions"
          onCta={() => {
            router.push("/homeowner/instructions");
          }}
          footer={
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                router.push("/agents");
              }}
            >
              Browse agent profiles
            </Button>
          }
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="tertiary"
            disabled={!messagingUnlocked}
            data-testid="open-messages-button"
            onClick={() => {
              router.push(`/messages?instructionId=${encodeURIComponent(instruction.id)}`);
            }}
          >
            {messagingUnlocked ? "Open messages" : "Messages open after shortlist"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="sticky top-4 z-20 space-y-4 border-line bg-surface-0/95 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Instruction {instruction.id}</p>
            <h2 className="text-lg font-semibold text-text-strong">
              {instruction.addressLine1}, {instruction.city} {instruction.postcode}
            </h2>
            <p className="text-sm text-text-muted">
              {formatPropertyType(instruction.propertyType)} · {instruction.bedrooms} bedrooms · {proposals.length} offers received
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={statusVariant(instructionStatus)}
              data-testid="instruction-status-badge"
              data-instruction-status={instructionStatus}
            >
              {formatStatusLabel(instructionStatus)}
            </Badge>
            <Badge variant="accent">{summaryStatusLabel}</Badge>
            <Badge
              variant={messagingUnlocked ? "success" : "warning"}
              data-testid="messaging-unlock-badge"
              data-messaging-state={messagingStateLabel}
            >
              Contact {messagingStateLabel}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-text-strong">Seller goals</h3>
            <p className="text-sm text-text-muted">{instruction.sellerGoals}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-text-strong">Offer window</h3>
            <p className="text-sm text-text-muted">
              {londonDateTimeFormatter.format(windowStart)} - {londonDateTimeFormatter.format(windowEnd)}
            </p>
            <p className="text-sm text-text-muted">Target timeline: {formatEnumLabel(instruction.targetTimeline)}</p>
          </div>
        </div>
      </Card>

      {toast ? (
        <InlineToast className={toast.kind === "error" ? "border-state-danger/20 bg-state-danger/5" : "border-state-success/20 bg-state-success/5"}>
          <InlineToastLabel>{toast.kind === "error" ? "Error" : "Success"}</InlineToastLabel>
          <div className="space-y-1">
            <p className="font-medium text-text-strong">{toast.title}</p>
            <p className="text-sm text-text-muted">{toast.message}</p>
          </div>
        </InlineToast>
      ) : null}

      <Card className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-text-strong">Compare offers side by side</h3>
          <p className="text-sm text-text-muted">Sort offers by what matters most to you right now.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((option) => (
            <Button
              key={option.key}
              type="button"
              size="sm"
              variant={sortBy === option.key ? "primary" : "secondary"}
              onClick={() => {
                setSortBy(option.key);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-text-muted">{activeSort.description}</p>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-text-strong">Decision highlights</h3>
          <p className="text-sm text-text-muted">Quick signals to help you decide what to shortlist first.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {decisionSpotlights.map((spotlight) => (
            <div
              key={`${spotlight.label}-${spotlight.agentName}`}
              className="rounded-md border border-line bg-surface-0 px-3 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">{spotlight.label}</p>
              <p className="mt-1 text-sm font-medium text-text-strong">{spotlight.agentName}</p>
              <p className="mt-1 text-xs text-text-muted">{spotlight.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <ProposalCompareTable
        proposals={sortedProposals}
        onDecision={handleDecision}
        pendingProposalId={pendingProposalId}
        highlightBadgesByProposalId={highlightBadgesByProposalId}
      />

      <Card className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-text-strong">Shortlist your top offers</h3>
          <p className="text-sm text-text-muted">
            Select up to three submitted offers to shortlist before you unlock contact.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sortedProposals.map((proposal) => {
            const selected = selectedProposalIds.includes(proposal.id);
            const disabled = proposal.status !== "SUBMITTED" || shortlistActionsDisabled;

            return (
              <label
                key={`shortlist-${proposal.id}`}
                className={`rounded-md border px-3 py-3 text-sm ${
                  selected ? "border-brand-accent bg-brand-accent/5" : "border-line bg-surface-0"
                } ${disabled ? "opacity-60" : "cursor-pointer"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-strong">{proposal.agentName}</p>
                    <p className="text-xs text-text-muted">Status: {formatProposalStatusLabel(proposal.status)}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => {
                      toggleShortlistSelection(proposal.id);
                    }}
                    aria-label={`Select ${proposal.agentName} for shortlist`}
                  />
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={shortlistActionsDisabled || selectedSubmittableProposals.length === 0}
            onClick={() => {
              void handleShortlistSelected();
            }}
          >
            Shortlist selected ({selectedSubmittableProposals.length})
          </Button>
          <span className="text-xs text-text-muted">Select up to 3 offers.</span>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-text-strong">Choose your agent</h3>
          <p className="text-sm text-text-muted">
            Once shortlisted, unlock contact and choose the offer you want to move forward with.
          </p>
        </div>

        {shortlistedProposals.length === 0 ? (
          <p className="text-sm text-text-muted">No shortlisted offers yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {shortlistedProposals.map((proposal) => (
              <Button
                key={`choose-${proposal.id}`}
                type="button"
                variant={proposal.status === "ACCEPTED" ? "secondary" : "tertiary"}
                disabled={proposal.status === "ACCEPTED" || pendingProposalId !== null || batchPending}
                onClick={() => {
                  void handleDecision(proposal.id, "AWARD");
                }}
              >
                {proposal.status === "ACCEPTED" ? `${proposal.agentName} chosen` : `Choose ${proposal.agentName}`}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!messagingUnlocked}
            data-testid="open-messages-button"
            onClick={() => {
              router.push(`/messages?instructionId=${encodeURIComponent(instruction.id)}`);
            }}
          >
            {messagingUnlocked ? "Open messages" : "Messages open after shortlist"}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => {
              router.push("/homeowner/instructions");
            }}
          >
            Back to instructions
          </Button>
        </div>
      </Card>
    </div>
  );
}
