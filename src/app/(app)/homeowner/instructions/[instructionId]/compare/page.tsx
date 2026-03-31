import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { CompareClient, type CompareInstructionData } from "./compare-client";

interface PageProps {
  params: Promise<{ instructionId: string }>;
}

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function makeSnippet(value: string, maxLength = 120): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function instructionNotFoundState(message: string): JSX.Element {
  return (
    <EmptyState
      title="Compare view unavailable"
      description={message}
      ctaLabel="Back to instructions"
      footer={
        <Link href="/homeowner/instructions" className={cn(buttonVariants({ variant: "secondary" }))}>
          Review instructions
        </Link>
      }
    />
  );
}

export default async function ProposalComparePage({ params }: PageProps): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "HOMEOWNER") {
    redirect("/sign-in?error=AccessDenied&next=/homeowner/instructions");
  }

  const { instructionId } = await params;

  let compareData: CompareInstructionData | null = null;
  let loadError: string | null = null;

  try {
    const instruction = await prisma.instruction.findFirst({
      where: {
        id: instructionId,
        property: {
          ownerId: session.user.id
        }
      },
      select: {
        id: true,
        status: true,
        sellerGoals: true,
        targetTimeline: true,
        bidWindowStartAt: true,
        bidWindowEndAt: true,
        property: {
          select: {
            addressLine1: true,
            city: true,
            postcode: true,
            propertyType: true,
            bedrooms: true
          }
        },
        proposals: {
          orderBy: {
            createdAt: "asc"
          },
          select: {
            id: true,
            status: true,
            feeModel: true,
            feeValue: true,
            inclusions: true,
            timelineDays: true,
            marketingPlan: true,
            cancellationTerms: true,
            agent: {
              select: {
                name: true,
                email: true,
                agentProfile: {
                  select: {
                    agencyName: true,
                    verificationStatus: true,
                    yearsExperience: true,
                    serviceAreas: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!instruction) {
      compareData = null;
    } else {
      compareData = {
        instruction: {
          id: instruction.id,
          addressLine1: instruction.property.addressLine1,
          city: instruction.property.city,
          postcode: instruction.property.postcode,
          propertyType: formatEnumLabel(instruction.property.propertyType),
          bedrooms: instruction.property.bedrooms,
          sellerGoals: instruction.sellerGoals,
          targetTimeline: instruction.targetTimeline,
          status: instruction.status,
          bidWindowStartAt: instruction.bidWindowStartAt.toISOString(),
          bidWindowEndAt: instruction.bidWindowEndAt.toISOString()
        },
        proposals: instruction.proposals.map((proposal) => ({
          id: proposal.id,
          agentName: proposal.agent.agentProfile?.agencyName ?? proposal.agent.name ?? proposal.agent.email,
          verificationStatus: proposal.agent.agentProfile?.verificationStatus ?? "UNVERIFIED",
          yearsExperience: proposal.agent.agentProfile?.yearsExperience ?? null,
          serviceAreas: proposal.agent.agentProfile?.serviceAreas ?? [],
          feeModel: proposal.feeModel,
          feeValue: Number(proposal.feeValue),
          inclusions: proposal.inclusions.map(formatEnumLabel),
          timelineDays: proposal.timelineDays,
          marketingPlanSnippet: makeSnippet(proposal.marketingPlan),
          cancellationTermsSnippet: makeSnippet(proposal.cancellationTerms, 100),
          status: proposal.status
        }))
      };
    }
  } catch {
    loadError = process.env.DATABASE_URL ? "We could not load this compare view right now." : "Database access is not configured in this environment.";
  }

  return (
    <AppShell role="HOMEOWNER" title="Compare Offers">
      <div className="space-y-6">
        {compareData ? (
          <CompareClient initialData={compareData} />
        ) : (
          instructionNotFoundState(loadError ?? "That instruction was not found, or you do not have access to it.")
        )}
      </div>
    </AppShell>
  );
}
