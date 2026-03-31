import type { InstructionStatus, ProposalStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { deriveBidWindowPhase } from "@/lib/instruction-status";
import { extractPostcodeDistrict } from "@/lib/postcode";
import { prisma } from "@/lib/prisma";
import type { CreateInstructionInput } from "@/lib/validation/instruction";
import type { ProposalSubmissionInput } from "@/lib/validation/proposal";
import { trackEvent } from "@/server/analytics";

export type MarketplaceServiceErrorCode =
  | "DATABASE_NOT_CONFIGURED"
  | "INVALID_BID_WINDOW"
  | "INSTRUCTION_NOT_FOUND"
  | "PROPOSAL_NOT_FOUND"
  | "MESSAGE_THREAD_NOT_FOUND"
  | "MESSAGE_THREAD_LOCKED"
  | "INSTRUCTION_NOT_LIVE"
  | "BID_WINDOW_NOT_OPEN"
  | "BID_WINDOW_CLOSED"
  | "DUPLICATE_PROPOSAL"
  | "SELF_BIDDING_NOT_ALLOWED"
  | "PROPOSAL_DECISION_NOT_ALLOWED"
  | "INSTRUCTION_ALREADY_AWARDED"
  | "AWARD_REQUIRES_SHORTLIST";

export class MarketplaceServiceError extends Error {
  readonly code: MarketplaceServiceErrorCode;
  readonly details?: unknown;

  constructor(
    code: MarketplaceServiceErrorCode,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "MarketplaceServiceError";
    this.code = code;
    this.details = details;
  }
}

export function getMarketplaceHttpStatus(
  code: MarketplaceServiceErrorCode
): number {
  switch (code) {
    case "DATABASE_NOT_CONFIGURED":
      return 503;
    case "INVALID_BID_WINDOW":
      return 400;
    case "INSTRUCTION_NOT_FOUND":
    case "PROPOSAL_NOT_FOUND":
    case "MESSAGE_THREAD_NOT_FOUND":
      return 404;
    case "SELF_BIDDING_NOT_ALLOWED":
      return 403;
    case "INSTRUCTION_NOT_LIVE":
    case "BID_WINDOW_NOT_OPEN":
    case "BID_WINDOW_CLOSED":
    case "DUPLICATE_PROPOSAL":
    case "MESSAGE_THREAD_LOCKED":
    case "PROPOSAL_DECISION_NOT_ALLOWED":
    case "INSTRUCTION_ALREADY_AWARDED":
    case "AWARD_REQUIRES_SHORTLIST":
      return 409;
  }
}

function assertDatabaseConfigured(): void {
  if (!process.env.DATABASE_URL) {
    throw new MarketplaceServiceError(
      "DATABASE_NOT_CONFIGURED",
      "DATABASE_URL is required for marketplace persistence."
    );
  }
}

export function inferInstructionStatusForCreate(
  bidWindowStartAt: Date,
  bidWindowEndAt: Date,
  now: Date = new Date()
): "DRAFT" | "LIVE" {
  if (bidWindowEndAt <= bidWindowStartAt) {
    throw new MarketplaceServiceError(
      "INVALID_BID_WINDOW",
      "Bid window end time must be after the start time."
    );
  }

  if (bidWindowEndAt <= now) {
    throw new MarketplaceServiceError(
      "INVALID_BID_WINDOW",
      "Bid window must end in the future."
    );
  }

  return bidWindowStartAt <= now ? "LIVE" : "DRAFT";
}

type ProposalSubmissionAvailability =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INSTRUCTION_NOT_LIVE"
        | "BID_WINDOW_NOT_OPEN"
        | "BID_WINDOW_CLOSED";
      message: string;
    };

export type ProposalDecisionAction = "SHORTLIST" | "REJECT" | "AWARD";

type MessageThreadParticipants = {
  instructionId: string;
  homeownerId: string;
  agentId: string;
};

const messageThreadReadSelect = Prisma.validator<Prisma.MessageThreadSelect>()({
  id: true,
  instructionId: true,
  homeownerId: true,
  agentId: true,
  status: true,
  createdAt: true,
  messages: {
    orderBy: {
      createdAt: "asc"
    },
    select: {
      id: true,
      threadId: true,
      senderId: true,
      body: true,
      createdAt: true
    }
  }
});

const messageCreateSelect = Prisma.validator<Prisma.MessageSelect>()({
  id: true,
  threadId: true,
  senderId: true,
  body: true,
  createdAt: true
});

const threadSummarySelectShape = Prisma.validator<Prisma.MessageThreadSelect>()({
  id: true,
  instructionId: true,
  homeownerId: true,
  agentId: true,
  status: true,
  createdAt: true,
  instruction: {
    select: {
      status: true,
      property: {
        select: {
          addressLine1: true,
          city: true,
          postcode: true
        }
      }
    }
  },
  homeowner: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  agent: {
    select: {
      id: true,
      name: true,
      email: true,
      agentProfile: {
        select: {
          agencyName: true
        }
      }
    }
  },
  messages: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    select: {
      id: true,
      senderId: true,
      body: true,
      createdAt: true
    }
  }
});

type MessageThreadForParticipant = Prisma.MessageThreadGetPayload<{
  select: typeof messageThreadReadSelect;
}>;

type MessageForParticipant = Prisma.MessageGetPayload<{
  select: typeof messageCreateSelect;
}>;

type MessageThreadSummaryRow = Prisma.MessageThreadGetPayload<{
  select: typeof threadSummarySelectShape;
}>;

export interface MessageThreadSummaryForParticipant {
  id: string;
  instructionId: string;
  status: "LOCKED" | "OPEN";
  instructionStatus: InstructionStatus;
  property: {
    addressLine1: string;
    city: string;
    postcode: string;
  };
  counterpart: {
    id: string;
    role: "HOMEOWNER" | "AGENT";
    name: string;
  };
  lastMessage: {
    id: string;
    senderId: string;
    body: string;
    createdAt: Date;
  } | null;
  createdAt: Date;
}

type ProposalDecisionTransition =
  | {
      ok: true;
      alreadyApplied: boolean;
      proposalStatus: ProposalStatus;
      instructionStatus: InstructionStatus;
      trackEventName: "proposal_shortlisted" | "proposal_awarded" | null;
    }
  | {
      ok: false;
      code:
        | "PROPOSAL_DECISION_NOT_ALLOWED"
        | "INSTRUCTION_ALREADY_AWARDED"
        | "AWARD_REQUIRES_SHORTLIST";
      message: string;
    };

export function assessProposalDecisionTransition(input: {
  action: ProposalDecisionAction;
  proposalId: string;
  proposalStatus: ProposalStatus;
  instructionStatus: InstructionStatus;
  acceptedProposalId: string | null;
  acceptedProposalCount: number;
}): ProposalDecisionTransition {
  if (input.acceptedProposalCount > 1) {
    return {
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded to another proposal."
    };
  }

  if (
    input.acceptedProposalCount === 1 &&
    input.acceptedProposalId !== null &&
    input.acceptedProposalId !== input.proposalId
  ) {
    return {
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded to another proposal."
    };
  }

  if (
    input.instructionStatus === "AWARDED" &&
    !(
      input.action === "AWARD" &&
      input.acceptedProposalCount === 1 &&
      input.acceptedProposalId === input.proposalId
    )
  ) {
    return {
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded."
    };
  }

  if (input.action === "SHORTLIST") {
    if (input.proposalStatus === "SHORTLISTED") {
      return {
        ok: true,
        alreadyApplied: true,
        proposalStatus: "SHORTLISTED",
        instructionStatus: input.instructionStatus,
        trackEventName: null
      };
    }

    if (input.proposalStatus !== "SUBMITTED") {
      return {
        ok: false,
        code: "PROPOSAL_DECISION_NOT_ALLOWED",
        message: "Only submitted proposals can be shortlisted."
      };
    }

    return {
      ok: true,
      alreadyApplied: false,
      proposalStatus: "SHORTLISTED",
      instructionStatus:
        input.instructionStatus === "AWARDED"
          ? input.instructionStatus
          : "SHORTLIST",
      trackEventName: "proposal_shortlisted"
    };
  }

  if (input.action === "REJECT") {
    if (input.proposalStatus === "REJECTED") {
      return {
        ok: true,
        alreadyApplied: true,
        proposalStatus: "REJECTED",
        instructionStatus: input.instructionStatus,
        trackEventName: null
      };
    }

    if (
      input.proposalStatus !== "SUBMITTED" &&
      input.proposalStatus !== "SHORTLISTED"
    ) {
      return {
        ok: false,
        code: "PROPOSAL_DECISION_NOT_ALLOWED",
        message: "Only submitted or shortlisted proposals can be rejected."
      };
    }

    return {
      ok: true,
      alreadyApplied: false,
      proposalStatus: "REJECTED",
      instructionStatus: input.instructionStatus,
      trackEventName: null
    };
  }

  if (input.acceptedProposalId && input.acceptedProposalId !== input.proposalId) {
    return {
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded to another proposal."
    };
  }

  if (input.proposalStatus === "ACCEPTED") {
    return {
      ok: true,
      alreadyApplied: true,
      proposalStatus: "ACCEPTED",
      instructionStatus: "AWARDED",
      trackEventName: null
    };
  }

  if (input.proposalStatus !== "SHORTLISTED") {
    return {
      ok: false,
      code: "AWARD_REQUIRES_SHORTLIST",
      message: "Only shortlisted proposals can be awarded."
    };
  }

  return {
    ok: true,
    alreadyApplied: false,
    proposalStatus: "ACCEPTED",
    instructionStatus: "AWARDED",
    trackEventName: "proposal_awarded"
  };
}

export function assessProposalSubmissionWindow(input: {
  instructionStatus: InstructionStatus;
  bidWindowStartAt: Date;
  bidWindowEndAt: Date;
  now?: Date;
}): ProposalSubmissionAvailability {
  if (input.instructionStatus !== "LIVE") {
    return {
      ok: false,
      code: "INSTRUCTION_NOT_LIVE",
      message: `Instruction status ${input.instructionStatus} does not accept proposals.`
    };
  }

  const phase = deriveBidWindowPhase(
    input.bidWindowStartAt,
    input.bidWindowEndAt,
    input.now
  );

  if (phase === "PRELIVE") {
    return {
      ok: false,
      code: "BID_WINDOW_NOT_OPEN",
      message: "Bid window has not opened yet."
    };
  }

  if (phase === "ENDED") {
    return {
      ok: false,
      code: "BID_WINDOW_CLOSED",
      message: "Bid window has closed."
    };
  }

  return { ok: true };
}

async function ensureLockedMessageThread(
  tx: Prisma.TransactionClient,
  participants: MessageThreadParticipants
): Promise<void> {
  await tx.messageThread.upsert({
    where: {
      instructionId_homeownerId_agentId: {
        instructionId: participants.instructionId,
        homeownerId: participants.homeownerId,
        agentId: participants.agentId
      }
    },
    create: {
      instructionId: participants.instructionId,
      homeownerId: participants.homeownerId,
      agentId: participants.agentId,
      status: "LOCKED"
    },
    update: {}
  });
}

async function unlockMessageThread(
  tx: Prisma.TransactionClient,
  participants: MessageThreadParticipants
): Promise<void> {
  const thread = await tx.messageThread.upsert({
    where: {
      instructionId_homeownerId_agentId: {
        instructionId: participants.instructionId,
        homeownerId: participants.homeownerId,
        agentId: participants.agentId
      }
    },
    create: {
      instructionId: participants.instructionId,
      homeownerId: participants.homeownerId,
      agentId: participants.agentId,
      status: "LOCKED"
    },
    update: {},
    select: {
      id: true,
      status: true
    }
  });

  if (thread.status !== "OPEN") {
    await tx.messageThread.update({
      where: { id: thread.id },
      data: { status: "OPEN" }
    });
  }
}

function throwMessageThreadNotFound(): never {
  throw new MarketplaceServiceError(
    "MESSAGE_THREAD_NOT_FOUND",
    "Message thread was not found."
  );
}

function assertMessageThreadParticipant<
  T extends { homeownerId: string; agentId: string }
>(
  thread: T | null,
  userId: string
): asserts thread is T {
  if (!thread || (thread.homeownerId !== userId && thread.agentId !== userId)) {
    throwMessageThreadNotFound();
  }
}

export async function getMessageThreadForParticipant(
  userId: string,
  threadId: string
): Promise<MessageThreadForParticipant> {
  assertDatabaseConfigured();

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: messageThreadReadSelect
  });

  assertMessageThreadParticipant(thread, userId);

  return thread;
}

export async function createMessageForParticipant(
  userId: string,
  threadId: string,
  body: string
): Promise<MessageForParticipant> {
  assertDatabaseConfigured();

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      homeownerId: true,
      agentId: true,
      status: true
    }
  });

  assertMessageThreadParticipant(thread, userId);

  if (thread.status !== "OPEN") {
    throw new MarketplaceServiceError(
      "MESSAGE_THREAD_LOCKED",
      "Message thread is locked."
    );
  }

  return prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: userId,
      body
    },
    select: messageCreateSelect
  });
}

function toParticipantThreadSummary(
  thread: MessageThreadSummaryRow,
  userId: string
): MessageThreadSummaryForParticipant {
  const userIsHomeowner = thread.homeownerId === userId;
  const counterpartName = userIsHomeowner
    ? thread.agent.agentProfile?.agencyName ??
      thread.agent.name ??
      thread.agent.email
    : thread.homeowner.name ?? thread.homeowner.email;
  const counterpart = userIsHomeowner
    ? {
        id: thread.agent.id,
        role: "AGENT" as const,
        name: counterpartName
      }
    : {
        id: thread.homeowner.id,
        role: "HOMEOWNER" as const,
        name: counterpartName
      };
  const lastMessage = thread.messages[0];

  return {
    id: thread.id,
    instructionId: thread.instructionId,
    status: thread.status,
    instructionStatus: thread.instruction.status,
    property: thread.instruction.property,
    counterpart,
    lastMessage:
      lastMessage === undefined
        ? null
        : {
            id: lastMessage.id,
            senderId: lastMessage.senderId,
            body: lastMessage.body,
            createdAt: lastMessage.createdAt
          },
    createdAt: thread.createdAt
  };
}

export async function listMessageThreadsForParticipant(
  userId: string,
  filters: { instructionId?: string } = {}
): Promise<MessageThreadSummaryForParticipant[]> {
  assertDatabaseConfigured();

  const where: Prisma.MessageThreadWhereInput = {
    OR: [{ homeownerId: userId }, { agentId: userId }]
  };

  if (filters.instructionId) {
    where.instructionId = filters.instructionId;
  }

  const threads = await prisma.messageThread.findMany({
    where,
    select: threadSummarySelectShape,
    orderBy: [{ status: "desc" }, { createdAt: "desc" }]
  });

  return threads.map((thread) => toParticipantThreadSummary(thread, userId));
}

export async function createInstructionForHomeowner(
  homeownerId: string,
  input: CreateInstructionInput
) {
  assertDatabaseConfigured();

  const status = inferInstructionStatusForCreate(
    input.bidWindowStartAt,
    input.bidWindowEndAt
  );

  const instruction = await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        ownerId: homeownerId,
        addressLine1: input.property.addressLine1,
        city: input.property.city,
        postcode: input.property.postcode,
        propertyType: input.property.propertyType,
        bedrooms: input.property.bedrooms,
        bathrooms: input.property.bathrooms ?? null,
        shortDescription: input.property.shortDescription,
        photos: input.property.photos
      }
    });

    return tx.instruction.create({
      data: {
        propertyId: property.id,
        sellerGoals: input.sellerGoals,
        targetTimeline: input.targetTimeline,
        bidWindowStartAt: input.bidWindowStartAt,
        bidWindowEndAt: input.bidWindowEndAt,
        status,
        mustHaves: input.mustHaves
      },
      select: {
        id: true,
        status: true,
        bidWindowStartAt: true,
        bidWindowEndAt: true,
        createdAt: true,
        mustHaves: true,
        property: {
          select: {
            id: true,
            postcode: true,
            city: true,
            propertyType: true,
            bedrooms: true
          }
        }
      }
    });
  });

  const postcodeDistrict =
    extractPostcodeDistrict(instruction.property.postcode) ?? "UNKNOWN";
  const bidWindowHours = Math.round(
    (instruction.bidWindowEndAt.getTime() -
      instruction.bidWindowStartAt.getTime()) /
      (1000 * 60 * 60)
  );

  trackEvent("instruction_created", {
    instructionId: instruction.id,
    homeownerId,
    instructionStatus: instruction.status,
    propertyType: instruction.property.propertyType,
    postcodeDistrict,
    bidWindowHours
  });

  if (instruction.status === "LIVE") {
    trackEvent("instruction_published", {
      instructionId: instruction.id,
      homeownerId,
      postcodeDistrict
    });
  }

  return instruction;
}

export async function submitProposalForAgent(
  agentId: string,
  input: ProposalSubmissionInput
) {
  assertDatabaseConfigured();

  const instruction = await prisma.instruction.findUnique({
    where: { id: input.instructionId },
    select: {
      id: true,
      status: true,
      bidWindowStartAt: true,
      bidWindowEndAt: true,
      property: {
        select: {
          ownerId: true,
          postcode: true
        }
      }
    }
  });

  if (!instruction) {
    throw new MarketplaceServiceError(
      "INSTRUCTION_NOT_FOUND",
      "Instruction was not found."
    );
  }

  if (instruction.property.ownerId === agentId) {
    throw new MarketplaceServiceError(
      "SELF_BIDDING_NOT_ALLOWED",
      "Agents cannot submit proposals on their own instructions."
    );
  }

  const availability = assessProposalSubmissionWindow({
    instructionStatus: instruction.status,
    bidWindowStartAt: instruction.bidWindowStartAt,
    bidWindowEndAt: instruction.bidWindowEndAt
  });

  if (!availability.ok) {
    if (
      availability.code === "BID_WINDOW_CLOSED" &&
      instruction.status === "LIVE"
    ) {
      await prisma.instruction.update({
        where: { id: instruction.id },
        data: { status: "CLOSED" }
      });
    }

    throw new MarketplaceServiceError(availability.code, availability.message);
  }

  try {
    const proposal = await prisma.$transaction(async (tx) => {
      const createdProposal = await tx.proposal.create({
        data: {
          instructionId: input.instructionId,
          agentId,
          feeModel: input.feeModel,
          feeValue: input.feeValue,
          currency: input.currency,
          inclusions: input.inclusions,
          marketingPlan: input.marketingPlan,
          timelineDays: input.timelineDays,
          cancellationTerms: input.cancellationTerms
        },
        select: {
          id: true,
          instructionId: true,
          status: true,
          createdAt: true,
          feeModel: true,
          timelineDays: true
        }
      });

      await ensureLockedMessageThread(tx, {
        instructionId: input.instructionId,
        homeownerId: instruction.property.ownerId,
        agentId
      });

      return createdProposal;
    });

    const postcodeDistrict =
      extractPostcodeDistrict(instruction.property.postcode) ?? "UNKNOWN";

    trackEvent("proposal_submitted", {
      proposalId: proposal.id,
      instructionId: proposal.instructionId,
      agentId,
      feeModel: proposal.feeModel,
      timelineDays: proposal.timelineDays,
      postcodeDistrict,
      inclusionsCount: input.inclusions.length
    });

    return proposal;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new MarketplaceServiceError(
          "DUPLICATE_PROPOSAL",
          "You already submitted a proposal for this instruction."
        );
      }

      if (error.code === "P2003") {
        throw new MarketplaceServiceError(
          "INSTRUCTION_NOT_FOUND",
          "Instruction was not found."
        );
      }
    }

    throw error;
  }
}

export async function decideProposalForHomeowner(
  homeownerId: string,
  proposalId: string,
  action: ProposalDecisionAction
) {
  assertDatabaseConfigured();

  return prisma.$transaction(async (tx) => {
    const initialProposal = await tx.proposal.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        status: true,
        agentId: true,
        instructionId: true,
        instruction: {
          select: {
            id: true,
            status: true,
            property: {
              select: {
                ownerId: true
              }
            }
          }
        }
      }
    });

    if (!initialProposal) {
      throw new MarketplaceServiceError(
        "PROPOSAL_NOT_FOUND",
        "Proposal was not found."
      );
    }

    if (initialProposal.instruction.property.ownerId !== homeownerId) {
      throw new MarketplaceServiceError(
        "PROPOSAL_NOT_FOUND",
        "Proposal was not found."
      );
    }

    await tx.$queryRaw`SELECT id FROM "Instruction" WHERE id = ${initialProposal.instructionId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "Proposal" WHERE id = ${initialProposal.id} FOR UPDATE`;

    const [proposal, instruction, acceptedProposal] = await Promise.all([
      tx.proposal.findUnique({
        where: { id: initialProposal.id },
        select: {
          id: true,
          status: true,
          instructionId: true,
          feeModel: true,
          timelineDays: true,
          createdAt: true
        }
      }),
      tx.instruction.findUnique({
        where: { id: initialProposal.instructionId },
        select: {
          id: true,
          status: true
        }
      }),
      tx.proposal.findMany({
        where: {
          instructionId: initialProposal.instructionId,
          status: "ACCEPTED"
        },
        select: {
          id: true
        }
      })
    ]);

    if (!proposal || !instruction) {
      throw new MarketplaceServiceError(
        "PROPOSAL_NOT_FOUND",
        "Proposal was not found."
      );
    }

    const acceptedProposalCount = acceptedProposal.length;

    const transition = assessProposalDecisionTransition({
      action,
      proposalId: proposal.id,
      proposalStatus: proposal.status,
      instructionStatus: instruction.status,
      acceptedProposalId: acceptedProposal[0]?.id ?? null,
      acceptedProposalCount
    });

    if (!transition.ok) {
      throw new MarketplaceServiceError(transition.code, transition.message);
    }

    if (!transition.alreadyApplied) {
      const updateOperations: Promise<unknown>[] = [
        tx.proposal.update({
          where: { id: proposal.id },
          data: { status: transition.proposalStatus }
        })
      ];

      if (instruction.status !== transition.instructionStatus) {
        updateOperations.push(
          tx.instruction.update({
            where: { id: instruction.id },
            data: { status: transition.instructionStatus }
          })
        );
      }

      await Promise.all(updateOperations);
    }

    if (action === "SHORTLIST" || action === "AWARD") {
      await unlockMessageThread(tx, {
        instructionId: proposal.instructionId,
        homeownerId,
        agentId: initialProposal.agentId
      });
    }

    const [nextProposal, nextInstruction] = await Promise.all([
      tx.proposal.findUnique({
        where: { id: proposal.id },
        select: {
          id: true,
          status: true,
          instructionId: true,
          feeModel: true,
          timelineDays: true,
          createdAt: true
        }
      }),
      tx.instruction.findUnique({
        where: { id: instruction.id },
        select: {
          id: true,
          status: true
        }
      })
    ]);

    if (!nextProposal || !nextInstruction) {
      throw new MarketplaceServiceError(
        "PROPOSAL_NOT_FOUND",
        "Proposal was not found."
      );
    }

    if (transition.trackEventName === "proposal_shortlisted") {
      trackEvent("proposal_shortlisted", {
        homeownerId,
        instructionId: nextProposal.instructionId,
        proposalId: nextProposal.id
      });
    }

    if (transition.trackEventName === "proposal_awarded") {
      trackEvent("proposal_awarded", {
        homeownerId,
        instructionId: nextProposal.instructionId,
        proposalId: nextProposal.id
      });
    }

    return {
      proposal: nextProposal,
      instruction: nextInstruction,
      alreadyApplied: transition.alreadyApplied,
      action
    };
  });
}
