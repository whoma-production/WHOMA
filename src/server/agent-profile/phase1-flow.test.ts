// @vitest-environment node

import { afterAll, describe, expect, test } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  completeAgentOnboarding,
  getAgentOnboardingFunnelCounts,
  getPublicAgentProfileBySlug,
  listPublicAgentProfiles,
  publishAgentProfile,
  setAgentVerificationStatus
} from "@/server/agent-profile/service";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const runDbTests = hasDatabase && process.env.RUN_DB_TESTS === "true";
const dbTest = runDbTests ? test : test.skip;

const createdUserIds = new Set<string>();

async function createAgentUser(
  runId: string
): Promise<{ id: string; email: string }> {
  const user = await prisma.user.create({
    data: {
      email: `phase1-agent-${runId}@example.test`,
      name: `Phase1 Agent ${runId}`,
      role: "AGENT"
    }
  });

  createdUserIds.add(user.id);
  return { id: user.id, email: user.email };
}

describe("phase 1 DB-backed flow", () => {
  dbTest(
    "onboarding -> publish -> verification transitions update public visibility",
    async () => {
      const runId = `${Date.now()}`;
      const agentUser = await createAgentUser(runId);

      const countsBefore = await getAgentOnboardingFunnelCounts();

      const onboardingProfile = await completeAgentOnboarding(agentUser.id, {
        fullName: `Phase1 Agent ${runId}`,
        workEmail: agentUser.email,
        phone: "+44 20 7946 0958",
        agencyName: "WHOMA Estates",
        jobTitle: "Senior Sales Negotiator",
        yearsExperience: 8,
        bio: "I support homeowners with clear pricing strategy, strong marketing, and dependable communication from instruction to completion.",
        serviceAreas: ["SW1A", "SE1"],
        specialties: ["Prime sales", "Family homes"]
      });

      expect(onboardingProfile.profileStatus).toBe("DRAFT");
      expect(onboardingProfile.verificationStatus).toBe("PENDING");
      expect(onboardingProfile.onboardingCompletedAt).not.toBeNull();
      expect(onboardingProfile.profileSlug).toBeTruthy();

      const publishedProfile = await publishAgentProfile(agentUser.id, {
        agencyName: "WHOMA Estates",
        jobTitle: "Senior Sales Negotiator",
        workEmail: agentUser.email,
        phone: "+44 20 7946 0958",
        yearsExperience: 8,
        bio: "I support homeowners with clear pricing strategy, strong marketing, and dependable communication from instruction to completion.",
        serviceAreas: ["SW1A", "SE1"],
        specialties: ["Prime sales", "Family homes"],
        achievements: ["Top negotiator 2025"],
        languages: ["English"]
      });

      expect(publishedProfile.profileStatus).toBe("PUBLISHED");
      expect(publishedProfile.publishedAt).not.toBeNull();
      expect(publishedProfile.profileCompleteness).toBeGreaterThanOrEqual(70);

      const slug = publishedProfile.profileSlug;
      expect(slug).toBeTruthy();

      const publicBeforeVerification = await getPublicAgentProfileBySlug(
        slug ?? ""
      );
      expect(publicBeforeVerification?.verificationStatus).toBe("PENDING");

      await setAgentVerificationStatus(agentUser.id, "VERIFIED");

      const publicAfterVerification = await getPublicAgentProfileBySlug(
        slug ?? ""
      );
      expect(publicAfterVerification?.verificationStatus).toBe("VERIFIED");

      const verifiedDirectory = await listPublicAgentProfiles({
        verifiedOnly: true
      });
      expect(
        verifiedDirectory.some((agent) => agent.userId === agentUser.id)
      ).toBe(true);

      const countsAfter = await getAgentOnboardingFunnelCounts();
      expect(countsAfter.started).toBeGreaterThanOrEqual(
        countsBefore.started + 1
      );
      expect(countsAfter.completed).toBeGreaterThanOrEqual(
        countsBefore.completed + 1
      );
      expect(countsAfter.published).toBeGreaterThanOrEqual(
        countsBefore.published + 1
      );
      expect(countsAfter.verified).toBeGreaterThanOrEqual(
        countsBefore.verified + 1
      );
    }
  );
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
