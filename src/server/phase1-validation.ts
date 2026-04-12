import { AgentProfileStatus, type Prisma } from "@prisma/client";

import { MIN_AGENT_PUBLISH_COMPLETENESS } from "@/lib/agent-activation";
import { prisma } from "@/lib/prisma";
import { PRODUCT_EVENT_NAMES } from "@/server/product-events";

export type Phase1ValidationObjectiveKey =
  | "qualifiedAgentDensity"
  | "historicTransactionLogging"
  | "liveTransactionLogging"
  | "collaborationListingParticipation"
  | "meaningfulInteraction14d"
  | "monthlyActiveEngagement";

export type Phase1ValidationStatus =
  | "Not started"
  | "In progress"
  | "Target met";

export interface Phase1ValidationObjective {
  key: Phase1ValidationObjectiveKey;
  title: string;
  description: string;
  current: number;
  target: number;
  status: Phase1ValidationStatus;
  windowLabel: string;
}

export interface Phase1ValidationSnapshot {
  generatedAt: Date;
  objectives: readonly Phase1ValidationObjective[];
}

const PHASE1_TARGETS: Record<Phase1ValidationObjectiveKey, number> = {
  qualifiedAgentDensity: 25,
  historicTransactionLogging: 40,
  liveTransactionLogging: 25,
  collaborationListingParticipation: 15,
  meaningfulInteraction14d: 10,
  monthlyActiveEngagement: 20
};

function shouldRestrictOfficialProductionData(): boolean {
  return process.env.NODE_ENV === "production";
}

function getOfficialAgentWhere(): Prisma.AgentProfileWhereInput {
  if (!shouldRestrictOfficialProductionData()) {
    return {};
  }

  return {
    user: {
      is: {
        dataOrigin: "PRODUCTION"
      }
    }
  };
}

function getOfficialAgentSubjectWhere(): Prisma.ProductEventWhereInput {
  const userWhere: Prisma.UserWhereInput = {
    role: "AGENT"
  };

  if (shouldRestrictOfficialProductionData()) {
    userWhere.dataOrigin = "PRODUCTION";
  }

  return {
    subjectUserId: {
      not: null
    },
    subjectUser: {
      is: userWhere
    }
  };
}

function toStatus(current: number, target: number): Phase1ValidationStatus {
  if (current >= target) {
    return "Target met";
  }

  if (current > 0) {
    return "In progress";
  }

  return "Not started";
}

function toObjective(input: {
  key: Phase1ValidationObjectiveKey;
  title: string;
  description: string;
  current: number;
  windowLabel: string;
}): Phase1ValidationObjective {
  const target = PHASE1_TARGETS[input.key];

  return {
    key: input.key,
    title: input.title,
    description: input.description,
    current: input.current,
    target,
    status: toStatus(input.current, target),
    windowLabel: input.windowLabel
  };
}

async function countUniqueAgentSubjects(
  where: Prisma.ProductEventWhereInput
): Promise<number> {
  const grouped = await prisma.productEvent.groupBy({
    by: ["subjectUserId"],
    where: {
      ...getOfficialAgentSubjectWhere(),
      ...where
    },
    _count: {
      _all: true
    }
  });

  return grouped.length;
}

export async function getPhase1ValidationSnapshot(): Promise<Phase1ValidationSnapshot> {
  if (!process.env.DATABASE_URL) {
    return {
      generatedAt: new Date(),
      objectives: [
        toObjective({
          key: "qualifiedAgentDensity",
          title: "Qualified agent density",
          description:
            "Agents with published, verified profiles at the required readiness threshold.",
          current: 0,
          windowLabel: "Current"
        }),
        toObjective({
          key: "historicTransactionLogging",
          title: "Historic transaction logging",
          description:
            "Agents with at least one logged historic transaction proof record.",
          current: 0,
          windowLabel: "Current"
        }),
        toObjective({
          key: "liveTransactionLogging",
          title: "Live transaction logging",
          description:
            "Agents with at least one logged live collaboration activity record.",
          current: 0,
          windowLabel: "Current"
        }),
        toObjective({
          key: "collaborationListingParticipation",
          title: "Collaboration-listing participation",
          description:
            "Agents who submitted a structured collaboration response in the last 30 days.",
          current: 0,
          windowLabel: "Last 30 days"
        }),
        toObjective({
          key: "meaningfulInteraction14d",
          title: "Meaningful interaction (14 days)",
          description:
            "Agents who received at least one interaction in the most recent 14-day window.",
          current: 0,
          windowLabel: "Last 14 days"
        }),
        toObjective({
          key: "monthlyActiveEngagement",
          title: "Monthly active engagement",
          description:
            "Agents with at least one core proof-loop event in the last 30 days.",
          current: 0,
          windowLabel: "Last 30 days"
        })
      ]
    };
  }

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [qualifiedAgentDensity, historicTransactionLogging, liveTransactionLogging, collaborationListingParticipation, meaningfulInteraction14d, monthlyActiveEngagement] =
    await Promise.all([
      prisma.agentProfile.count({
        where: {
          ...getOfficialAgentWhere(),
          profileStatus: AgentProfileStatus.PUBLISHED,
          verificationStatus: "VERIFIED",
          profileCompleteness: {
            gte: MIN_AGENT_PUBLISH_COMPLETENESS
          }
        }
      }),
      countUniqueAgentSubjects({
        eventName: PRODUCT_EVENT_NAMES.transactionLogged,
        actorRole: "AGENT"
      }),
      countUniqueAgentSubjects({
        eventName: PRODUCT_EVENT_NAMES.listingCreated,
        actorRole: "AGENT"
      }),
      countUniqueAgentSubjects({
        eventName: PRODUCT_EVENT_NAMES.proposalSubmitted,
        actorRole: "AGENT",
        createdAt: {
          gte: thirtyDaysAgo
        }
      }),
      countUniqueAgentSubjects({
        eventName: PRODUCT_EVENT_NAMES.interactionReceived,
        createdAt: {
          gte: fourteenDaysAgo
        }
      }),
      countUniqueAgentSubjects({
        eventName: {
          in: [
            PRODUCT_EVENT_NAMES.transactionLogged,
            PRODUCT_EVENT_NAMES.listingCreated,
            PRODUCT_EVENT_NAMES.profileLinkShared,
            PRODUCT_EVENT_NAMES.interactionReceived,
            PRODUCT_EVENT_NAMES.proposalSubmitted,
            PRODUCT_EVENT_NAMES.messageSent
          ]
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      })
    ]);

  return {
    generatedAt: now,
    objectives: [
      toObjective({
        key: "qualifiedAgentDensity",
        title: "Qualified agent density",
        description:
          "Agents with published, verified profiles at the required readiness threshold.",
        current: qualifiedAgentDensity,
        windowLabel: "Current"
      }),
      toObjective({
        key: "historicTransactionLogging",
        title: "Historic transaction logging",
        description:
          "Agents with at least one logged historic transaction proof record.",
        current: historicTransactionLogging,
        windowLabel: "Current"
      }),
      toObjective({
        key: "liveTransactionLogging",
        title: "Live transaction logging",
        description:
          "Agents with at least one logged live collaboration activity record.",
        current: liveTransactionLogging,
        windowLabel: "Current"
      }),
      toObjective({
        key: "collaborationListingParticipation",
        title: "Collaboration-listing participation",
        description:
          "Agents who submitted a structured collaboration response in the last 30 days.",
        current: collaborationListingParticipation,
        windowLabel: "Last 30 days"
      }),
      toObjective({
        key: "meaningfulInteraction14d",
        title: "Meaningful interaction (14 days)",
        description:
          "Agents who received at least one interaction in the most recent 14-day window.",
        current: meaningfulInteraction14d,
        windowLabel: "Last 14 days"
      }),
      toObjective({
        key: "monthlyActiveEngagement",
        title: "Monthly active engagement",
        description:
          "Agents with at least one core proof-loop event in the last 30 days.",
        current: monthlyActiveEngagement,
        windowLabel: "Last 30 days"
      })
    ]
  };
}
