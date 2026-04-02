import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getHomeownerInstructionSummaries } from "@/server/marketplace/queries";
import { cn } from "@/lib/utils";

const londonDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London"
});

function statusLabel(
  status: "DRAFT" | "LIVE" | "CLOSED" | "SHORTLIST" | "AWARDED"
): string {
  if (status === "LIVE") return "Open for offers";
  if (status === "SHORTLIST") return "Shortlisting";
  if (status === "AWARDED") return "Agent chosen";
  if (status === "CLOSED") return "Offer window closed";
  return "Draft";
}

function statusVariant(
  status: "DRAFT" | "LIVE" | "CLOSED" | "SHORTLIST" | "AWARDED"
): "default" | "accent" | "warning" | "success" {
  if (status === "LIVE") return "accent";
  if (status === "CLOSED") return "warning";
  if (status === "SHORTLIST" || status === "AWARDED") return "success";
  return "default";
}

export default async function HomeownerInstructionsIndexPage(): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "HOMEOWNER") {
    redirect("/sign-in?error=AccessDenied&next=/homeowner/instructions");
  }

  const instructions = await getHomeownerInstructionSummaries(session.user.id);
  const openCount = instructions.filter(
    (instruction) => instruction.status === "LIVE"
  ).length;
  const shortlistCount = instructions.filter(
    (instruction) => instruction.status === "SHORTLIST"
  ).length;
  const chosenCount = instructions.filter(
    (instruction) => instruction.status === "AWARDED"
  ).length;

  return (
    <AppShell role="HOMEOWNER" title="My Sale Requests">
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-3">
          <Card className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              Open for offers
            </p>
            <p className="text-2xl font-semibold text-text-strong">
              {openCount}
            </p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              Shortlisting
            </p>
            <p className="text-2xl font-semibold text-text-strong">
              {shortlistCount}
            </p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              Agent chosen
            </p>
            <p className="text-2xl font-semibold text-text-strong">
              {chosenCount}
            </p>
          </Card>
        </section>

        {instructions.length === 0 ? (
          <Card className="border-dashed">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-text-strong">
                No sale requests yet
              </h2>
              <p className="text-sm text-text-muted">
                Post your first sale request to start receiving agent offers
                side by side.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/homeowner/instructions/new"
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" })
                  )}
                >
                  Post sale request
                </Link>
                <Link
                  href="/requests"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" })
                  )}
                >
                  Browse seller-request areas
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <section className="space-y-3">
            {instructions.map((instruction) => (
              <Card
                key={instruction.id}
                className="space-y-4"
                data-testid="homeowner-request-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                      Sale request {instruction.id}
                    </p>
                    <h2 className="text-lg font-semibold text-text-strong">
                      {instruction.addressLine1}, {instruction.city}{" "}
                      {instruction.postcode}
                    </h2>
                    <p className="text-sm text-text-muted">
                      {instruction.propertyType} · {instruction.bedrooms}{" "}
                      bedrooms · Timeline: {instruction.targetTimeline}
                    </p>
                  </div>

                  <Badge variant={statusVariant(instruction.status)}>
                    {statusLabel(instruction.status)}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Offers
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {instruction.offersCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Shortlisted
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {instruction.shortlistedOffersCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Chosen
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {instruction.chosenOffersCount}
                    </p>
                  </div>
                  <div className="rounded-md border border-line bg-surface-0 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                      Offer window ends
                    </p>
                    <p className="text-sm font-medium text-text-strong">
                      {londonDateTimeFormatter.format(
                        new Date(instruction.bidWindowEndAtIso)
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/homeowner/instructions/${instruction.id}/compare`}
                    className={cn(
                      buttonVariants({ variant: "primary", size: "sm" })
                    )}
                  >
                    Compare offers
                  </Link>
                  <Link
                    href={`/messages?instructionId=${encodeURIComponent(instruction.id)}`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" })
                    )}
                  >
                    {instruction.contactUnlocked
                      ? "Open contact"
                      : "View message status"}
                  </Link>
                </div>
              </Card>
            ))}
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/homeowner/instructions/new"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            Post new sale request
          </Link>
          <Link
            href="/agents"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            Browse agent profiles
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
