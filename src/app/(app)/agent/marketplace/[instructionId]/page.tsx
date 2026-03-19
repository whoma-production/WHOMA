import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { ProposalCompareTable } from "@/components/proposal-compare-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ instructionId: string }>;
  searchParams?: Promise<{ view?: string }>;
}

export default async function AgentInstructionDetailPage({ params, searchParams }: PageProps): Promise<JSX.Element> {
  const { instructionId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const homeownerView = resolvedSearchParams?.view === "homeowner";

  return (
    <AppShell role={homeownerView ? "HOMEOWNER" : "AGENT"} title="Instruction Detail">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Instruction {instructionId}</p>
              <h2 className="mt-1 text-lg">SW1A · 2-bed flat · Bid window active</h2>
              <p className="text-sm text-text-muted">Single source of truth for seller brief, countdown, structured proposals, and shortlist/award actions.</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="accent">18h remaining</Badge>
              <Badge>{homeownerView ? "Homeowner view" : "Agent view"}</Badge>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-text-strong">Seller brief</h3>
              <p className="text-sm text-text-muted">Looking for strong local buyer reach, accompanied viewings, and weekly feedback cadence. Prefer realistic pricing strategy over inflated valuations.</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-text-strong">Property summary</h3>
              <p className="text-sm text-text-muted">Flat · 2 bedrooms · Chain free · SW1A district. Photos optional in MVP and can be uploaded later.</p>
            </div>
          </div>
          {!homeownerView ? (
            <div className="flex flex-wrap gap-2">
              <Link href={`/agent/marketplace/${instructionId}/proposal`} className={cn(buttonVariants({ variant: "primary" }))}>
                Submit Proposal
              </Link>
              <Link href={`/agent/marketplace/${instructionId}?view=homeowner`} className={cn(buttonVariants({ variant: "secondary" }))}>
                Preview Homeowner Compare Mode
              </Link>
            </div>
          ) : null}
        </Card>

        {homeownerView ? (
          <ProposalCompareTable
            proposals={[
              {
                id: "prop-a",
                agentName: "Northbank Estates",
                verificationStatus: "VERIFIED",
                feeModel: "PERCENT",
                feeValue: 1.15,
                inclusions: ["Professional photography", "Floorplan", "Portal listings"],
                timelineDays: 35,
                marketingPlanSnippet: "Buyer-database first, then portals with weekly review.",
                cancellationTermsSnippet: "14-day rolling notice after initial term.",
                status: "SHORTLISTED"
              },
              {
                id: "prop-b",
                agentName: "Harbour & Co",
                verificationStatus: "PENDING",
                feeModel: "FIXED",
                feeValue: 1800,
                inclusions: ["Professional photography", "Accompanied viewings"],
                timelineDays: 49,
                marketingPlanSnippet: "Immediate portal exposure and Saturday open-home schedule.",
                cancellationTermsSnippet: "8-week sole agency, then rolling 21-day notice.",
                status: "SUBMITTED"
              }
            ]}
          />
        ) : (
          <Card className="space-y-4">
            <h3 className="text-base font-semibold text-text-strong">Agent submission guidance</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-text-muted">
              <li>Proposals are structured and comparable; freeform-only bids are not accepted.</li>
              <li>Chat is gated and secondary. Submit Proposal is the primary real estate agent workflow action.</li>
              <li>Manual verification status is displayed to the homeowner as a trust badge.</li>
            </ul>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
