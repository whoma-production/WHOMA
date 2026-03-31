// @vitest-environment node

import { afterAll, describe, expect, test } from "vitest";

import { prisma } from "@/lib/prisma";
import type { ProposalSubmissionInput } from "@/lib/validation/proposal";
import {
  createInstructionForHomeowner,
  decideProposalForHomeowner,
  submitProposalForAgent
} from "@/server/marketplace/service";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const runDbTests = hasDatabase && process.env.RUN_DB_TESTS === "true";
const dbTest = runDbTests ? test : test.skip;

const createdUserIds = new Set<string>();

async function createUser(role: "HOMEOWNER" | "AGENT", runId: string) {
  const user = await prisma.user.create({
    data: {
      email: `marketplace-${role.toLowerCase()}-${runId}@example.test`,
      name: `Marketplace ${role} ${runId}`,
      role
    },
    select: {
      id: true,
      email: true
    }
  });

  createdUserIds.add(user.id);
  return user;
}

function buildInstructionInput(runId: string) {
  const bidWindowStartAt = new Date(Date.now() - 60 * 60 * 1000);
  const bidWindowEndAt = new Date(bidWindowStartAt.getTime() + 24 * 60 * 60 * 1000);

  return {
    property: {
      addressLine1: `12 Test Lane ${runId}`,
      city: "London",
      postcode: "SW1A 1AA",
      propertyType: "FLAT" as const,
      bedrooms: 2,
      bathrooms: 1,
      shortDescription:
        "Bright two bedroom flat with modern finish, close transport, and chain-free seller.",
      photos: []
    },
    sellerGoals:
      "Need realistic pricing guidance, accompanied viewings, and consistent communication through to completion.",
    targetTimeline: "ASAP" as const,
    bidWindowStartAt,
    bidWindowEndAt,
    bidWindowHours: 24,
    mustHaves: ["Accompanied viewings"]
  };
}

function buildProposalInput(instructionId: string): ProposalSubmissionInput {
  return {
    instructionId,
    feeModel: "FIXED",
    feeValue: 1500,
    currency: "GBP",
    inclusions: ["ACCOMPANIED_VIEWINGS"],
    marketingPlan:
      "We will run launch pricing, premium portal positioning, and weekly vendor reporting with buyer feedback.",
    timelineDays: 42,
    cancellationTerms:
      "Fourteen day notice period with no hidden exit penalties."
  };
}

describe("marketplace message thread persistence", () => {
  dbTest(
    "SHORTLIST unlocks only the shortlisted homeowner-agent thread and leaves others locked",
    async () => {
      const runId = `${Date.now()}-shortlist`;
      const homeowner = await createUser("HOMEOWNER", `${runId}-homeowner`);
      const shortlistedAgent = await createUser("AGENT", `${runId}-agent-a`);
      const otherAgent = await createUser("AGENT", `${runId}-agent-b`);

      const instruction = await createInstructionForHomeowner(
        homeowner.id,
        buildInstructionInput(runId)
      );

      const shortlistedProposal = await submitProposalForAgent(
        shortlistedAgent.id,
        buildProposalInput(instruction.id)
      );

      await submitProposalForAgent(otherAgent.id, buildProposalInput(instruction.id));

      const lockedThreads = await prisma.messageThread.findMany({
        where: {
          instructionId: instruction.id
        },
        orderBy: {
          agentId: "asc"
        }
      });

      expect(lockedThreads).toHaveLength(2);
      expect(lockedThreads.every((thread) => thread.status === "LOCKED")).toBe(true);
      expect(
        lockedThreads.some(
          (thread) =>
            thread.homeownerId === homeowner.id &&
            thread.agentId === shortlistedAgent.id
        )
      ).toBe(true);

      await prisma.messageThread.delete({
        where: {
          instructionId_homeownerId_agentId: {
            instructionId: instruction.id,
            homeownerId: homeowner.id,
            agentId: shortlistedAgent.id
          }
        }
      });

      await decideProposalForHomeowner(homeowner.id, shortlistedProposal.id, "SHORTLIST");

      const shortlistedThread = await prisma.messageThread.findUnique({
        where: {
          instructionId_homeownerId_agentId: {
            instructionId: instruction.id,
            homeownerId: homeowner.id,
            agentId: shortlistedAgent.id
          }
        }
      });

      const otherThread = await prisma.messageThread.findUnique({
        where: {
          instructionId_homeownerId_agentId: {
            instructionId: instruction.id,
            homeownerId: homeowner.id,
            agentId: otherAgent.id
          }
        }
      });

      expect(shortlistedThread).not.toBeNull();
      expect(shortlistedThread?.status).toBe("OPEN");
      expect(shortlistedThread?.homeownerId).toBe(homeowner.id);
      expect(shortlistedThread?.agentId).toBe(shortlistedAgent.id);

      expect(otherThread).not.toBeNull();
      expect(otherThread?.status).toBe("LOCKED");
      expect(otherThread?.homeownerId).toBe(homeowner.id);
      expect(otherThread?.agentId).toBe(otherAgent.id);
    }
  );

  dbTest("AWARD keeps or re-opens the homeowner-agent thread", async () => {
    const runId = `${Date.now()}-award`;
    const homeowner = await createUser("HOMEOWNER", `${runId}-homeowner`);
    const awardedAgent = await createUser("AGENT", `${runId}-agent`);

    const instruction = await createInstructionForHomeowner(
      homeowner.id,
      buildInstructionInput(runId)
    );

    const proposal = await submitProposalForAgent(
      awardedAgent.id,
      buildProposalInput(instruction.id)
    );

    await decideProposalForHomeowner(homeowner.id, proposal.id, "SHORTLIST");

    const threadAfterShortlist = await prisma.messageThread.findUnique({
      where: {
        instructionId_homeownerId_agentId: {
          instructionId: instruction.id,
          homeownerId: homeowner.id,
          agentId: awardedAgent.id
        }
      },
      select: {
        id: true,
        status: true
      }
    });

    expect(threadAfterShortlist?.status).toBe("OPEN");

    if (!threadAfterShortlist) {
      throw new Error("Expected message thread after shortlist.");
    }

    await prisma.messageThread.update({
      where: { id: threadAfterShortlist.id },
      data: { status: "LOCKED" }
    });

    await decideProposalForHomeowner(homeowner.id, proposal.id, "AWARD");

    const threadAfterAward = await prisma.messageThread.findUnique({
      where: {
        instructionId_homeownerId_agentId: {
          instructionId: instruction.id,
          homeownerId: homeowner.id,
          agentId: awardedAgent.id
        }
      },
      select: {
        id: true,
        status: true,
        homeownerId: true,
        agentId: true
      }
    });

    expect(threadAfterAward?.id).toBe(threadAfterShortlist.id);
    expect(threadAfterAward?.status).toBe("OPEN");
    expect(threadAfterAward?.homeownerId).toBe(homeowner.id);
    expect(threadAfterAward?.agentId).toBe(awardedAgent.id);
  });
});

afterAll(async () => {
  if (!createdUserIds.size) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      id: {
        in: Array.from(createdUserIds)
      }
    }
  });
});
