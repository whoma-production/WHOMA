// @vitest-environment node

import { afterAll, describe, expect, test } from "vitest";

import { prisma } from "@/lib/prisma";
import type { ProposalSubmissionInput } from "@/lib/validation/proposal";
import {
  createInstructionForHomeowner,
  createMessageForParticipant,
  decideProposalForHomeowner,
  getMessageThreadForParticipant,
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

async function createLockedThreadFixture() {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const homeowner = await createUser("HOMEOWNER", `${runId}-homeowner`);
  const agent = await createUser("AGENT", `${runId}-agent`);

  const instruction = await createInstructionForHomeowner(
    homeowner.id,
    buildInstructionInput(runId)
  );

  const proposal = await submitProposalForAgent(
    agent.id,
    buildProposalInput(instruction.id)
  );

  const thread = await prisma.messageThread.findUnique({
    where: {
      instructionId_homeownerId_agentId: {
        instructionId: instruction.id,
        homeownerId: homeowner.id,
        agentId: agent.id
      }
    },
    select: {
      id: true,
      status: true,
      homeownerId: true,
      agentId: true
    }
  });

  if (!thread) {
    throw new Error("Expected a locked message thread fixture.");
  }

  return { homeowner, agent, instruction, proposal, thread };
}

describe("marketplace message access persistence", () => {
  dbTest("participant can read thread data", async () => {
    const { homeowner, thread } = await createLockedThreadFixture();

    const visibleThread = await getMessageThreadForParticipant(
      homeowner.id,
      thread.id
    );

    expect(visibleThread.id).toBe(thread.id);
    expect(visibleThread.status).toBe("LOCKED");
    expect(visibleThread.homeownerId).toBe(homeowner.id);
    expect(visibleThread.messages).toEqual([]);
  });

  dbTest("non-participant is denied thread access", async () => {
    const { thread } = await createLockedThreadFixture();
    const outsider = await createUser("AGENT", `${Date.now()}-outsider`);

    await expect(
      getMessageThreadForParticipant(outsider.id, thread.id)
    ).rejects.toMatchObject({
      code: "MESSAGE_THREAD_NOT_FOUND"
    });
  });

  dbTest("locked thread send is denied", async () => {
    const { agent, thread } = await createLockedThreadFixture();

    await expect(
      createMessageForParticipant(agent.id, thread.id, "Hello from the agent.")
    ).rejects.toMatchObject({
      code: "MESSAGE_THREAD_LOCKED"
    });
  });

  dbTest("open thread send succeeds and persists the sender", async () => {
    const { homeowner, agent, proposal, thread } = await createLockedThreadFixture();

    await decideProposalForHomeowner(homeowner.id, proposal.id, "SHORTLIST");

    const createdMessage = await createMessageForParticipant(
      agent.id,
      thread.id,
      "Hello, thanks for the shortlist."
    );

    expect(createdMessage.threadId).toBe(thread.id);
    expect(createdMessage.senderId).toBe(agent.id);
    expect(createdMessage.body).toBe("Hello, thanks for the shortlist.");

    const visibleThread = await getMessageThreadForParticipant(
      homeowner.id,
      thread.id
    );

    expect(visibleThread.messages).toHaveLength(1);
    expect(visibleThread.messages[0]?.senderId).toBe(agent.id);
    expect(visibleThread.messages[0]?.body).toBe(
      "Hello, thanks for the shortlist."
    );
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
