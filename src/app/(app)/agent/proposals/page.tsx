import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getAgentOfferSummaries } from "@/server/marketplace/queries";
import { formatGBP } from "@/lib/currency";
import { cn } from "@/lib/utils";

const londonDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London"
});

function offerStatusVariant(
  status: "SUBMITTED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED"
): "default" | "accent" | "success" | "danger" {
  if (status === "SHORTLISTED") return "success";
  if (status === "ACCEPTED") return "accent";
  if (status === "REJECTED") return "danger";
  return "default";
}

function offerStatusLabel(status: "SUBMITTED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED"): string {
  if (status === "SHORTLISTED") return "Shortlisted";
  if (status === "ACCEPTED") return "Chosen";
  if (status === "REJECTED") return "Not selected";
  return "Submitted";
}

function instructionStatusLabel(
  status: "DRAFT" | "LIVE" | "CLOSED" | "SHORTLIST" | "AWARDED"
): string {
  if (status === "LIVE") return "Open for offers";
  if (status === "SHORTLIST") return "Shortlisting";
  if (status === "AWARDED") return "Agent chosen";
  if (status === "CLOSED") return "Offer window closed";
  return "Draft";
}

function feeSummary(
  feeModel: "FIXED" | "PERCENT" | "HYBRID" | "SUCCESS_BANDS",
  feeValue: number
): string {
  if (feeModel === "PERCENT") {
    return `${new Intl.NumberFormat("en-GB", {
      maximumFractionDigits: 2
    }).format(feeValue)}%`;
  }

  return formatGBP(feeValue);
}

function groupOrderValue(status: "SUBMITTED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED"): number {
  if (status === "ACCEPTED") return 0;
  if (status === "SHORTLISTED") return 1;
  if (status === "SUBMITTED") return 2;
  return 3;
}

export default async function AgentProposalsPage(): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/proposals");
  }

  const offers = await getAgentOfferSummaries(session.user.id);
  const groupedStatuses = [...new Set(offers.map((offer) => offer.status))].sort(
    (left, right) => groupOrderValue(left) - groupOrderValue(right)
  );

  const submittedCount = offers.filter((offer) => offer.status === "SUBMITTED").length;
  const shortlistedCount = offers.filter((offer) => offer.status === "SHORTLISTED").length;
  const acceptedCount = offers.filter((offer) => offer.status === "ACCEPTED").length;

  return (
    <AppShell role="AGENT" title="My Offers">
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-3">
          <Card className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Submitted</p>
            <p className="text-2xl font-semibold text-text-strong">{submittedCount}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Shortlisted</p>
            <p className="text-2xl font-semibold text-text-strong">{shortlistedCount}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Chosen</p>
            <p className="text-2xl font-semibold text-text-strong">{acceptedCount}</p>
          </Card>
        </section>

        {offers.length === 0 ? (
          <Card className="border-dashed bg-surface-0">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-text-strong">No offers submitted yet</h2>
              <p className="text-sm text-text-muted">
                Browse open instructions to submit your first structured offer.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/agent/marketplace" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
                  Browse open instructions
                </Link>
                <Link href="/agent/profile/edit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                  Complete profile
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          groupedStatuses.map((status) => {
            const group = offers.filter((offer) => offer.status === status);

            return (
              <section key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text-strong">{offerStatusLabel(status)}</h2>
                  <Badge variant={offerStatusVariant(status)}>
                    {group.length} offer{group.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {group.map((offer) => (
                    <Card key={offer.id} className="space-y-4" data-testid="agent-offer-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                            Offer {offer.id}
                          </p>
                          <h3 className="text-base font-semibold text-text-strong">
                            {offer.instruction.addressLine1}, {offer.instruction.city} {offer.instruction.postcode}
                          </h3>
                          <p className="text-sm text-text-muted">
                            {offer.instruction.propertyType} · {offer.instruction.bedrooms} bedrooms · Timeline goal:{" "}
                            {offer.instruction.targetTimeline}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={offerStatusVariant(offer.status)}>{offerStatusLabel(offer.status)}</Badge>
                          <Badge variant="default">{instructionStatusLabel(offer.instruction.status)}</Badge>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Fee</p>
                          <p className="text-sm font-medium text-text-strong">{feeSummary(offer.feeModel, offer.feeValue)}</p>
                        </div>
                        <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Timeline</p>
                          <p className="text-sm font-medium text-text-strong">{offer.timelineDays} days</p>
                        </div>
                        <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Competing offers</p>
                          <p className="text-sm font-medium text-text-strong">{offer.instruction.totalOffersCount}</p>
                        </div>
                        <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Window ends</p>
                          <p className="text-sm font-medium text-text-strong">
                            {londonDateTimeFormatter.format(new Date(offer.instruction.bidWindowEndAtIso))}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/agent/marketplace/${offer.instruction.id}`}
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                        >
                          View instruction
                        </Link>
                        <Link
                          href={`/messages?instructionId=${encodeURIComponent(offer.instruction.id)}`}
                          className={cn(buttonVariants({ variant: "tertiary", size: "sm" }))}
                        >
                          {offer.contactThreadStatus === "OPEN" ? "Open messages" : "Messaging locked"}
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
