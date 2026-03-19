import { ProposalCompareTable, type ComparableProposal } from "@/components/proposal-compare-table";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const proposals: ComparableProposal[] = [
  {
    id: "prop_1",
    agentName: "Northbank Estates",
    verificationStatus: "VERIFIED",
    feeModel: "PERCENT",
    feeValue: 1.15,
    inclusions: ["Professional photography", "Floorplan", "Portal listings", "Sales progression support"],
    timelineDays: 35,
    marketingPlanSnippet: "Buyer-database first release, portal launch on day 3, weekly pricing review with vendor.",
    cancellationTermsSnippet: "14-day notice. No withdrawal fee after cooling-off period.",
    status: "SHORTLISTED"
  },
  {
    id: "prop_2",
    agentName: "Harbour & Co",
    verificationStatus: "PENDING",
    feeModel: "FIXED",
    feeValue: 1800,
    inclusions: ["Professional photography", "Floorplan", "Accompanied viewings"],
    timelineDays: 49,
    marketingPlanSnippet: "Immediate portal listing, social cutdowns, Saturday open-home strategy with accompanied viewings.",
    cancellationTermsSnippet: "8-week sole agency term, then rolling with 21-day notice.",
    status: "SUBMITTED"
  },
  {
    id: "prop_3",
    agentName: "Civic Property Sales",
    verificationStatus: "UNVERIFIED",
    feeModel: "HYBRID",
    feeValue: 950,
    inclusions: ["Portal listings", "Hosted viewings", "EPC assistance"],
    timelineDays: 42,
    marketingPlanSnippet: "Hybrid model combining upfront listing package and success fee after completion.",
    cancellationTermsSnippet: "Upfront package non-refundable; success fee only on completion.",
    status: "SUBMITTED"
  }
];

export default function ProposalComparePage(): JSX.Element {
  return (
    <AppShell role="HOMEOWNER" title="Compare Proposals">
      <div className="space-y-6">
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Instruction status</p>
            <h2 className="mt-1 text-lg">2-bed flat · SW1A · Bid window closed</h2>
            <p className="text-sm text-text-muted">Comparison-first layout lets you shortlist and award without opening chat first.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="accent">3 proposals received</Badge>
            <Badge>Chat locked until shortlist/award</Badge>
          </div>
        </Card>

        <ProposalCompareTable proposals={proposals} />
      </div>
    </AppShell>
  );
}
