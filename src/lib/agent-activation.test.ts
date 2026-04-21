import { describe, expect, it } from "vitest";

import {
  getAgentActivationChecklist,
  getAgentActivationState,
  MIN_AGENT_PUBLISH_COMPLETENESS
} from "@/lib/agent-activation";

describe("agent activation helpers", () => {
  it("derives activation state from the current profile snapshot", () => {
    const state = getAgentActivationState({
      workEmailVerifiedAt: new Date("2026-03-31T08:00:00Z"),
      onboardingCompletedAt: new Date("2026-03-31T08:10:00Z"),
      profileCompleteness: 84,
      profileStatus: "PUBLISHED",
      verificationStatus: "PENDING"
    });

    expect(state.workEmailVerified).toBe(true);
    expect(state.onboardingCompleted).toBe(true);
    expect(state.profileReadyForPublish).toBe(true);
    expect(state.profilePublished).toBe(true);
    expect(state.adminVerified).toBe(false);
    expect(state.profileCompleteness).toBe(84);
  });

  it("marks the first incomplete checklist item as current", () => {
    const checklist = getAgentActivationChecklist({
      workEmailVerifiedAt: new Date("2026-03-31T08:00:00Z"),
      onboardingCompletedAt: new Date("2026-03-31T08:10:00Z"),
      profileCompleteness: MIN_AGENT_PUBLISH_COMPLETENESS - 5,
      profileStatus: "DRAFT",
      verificationStatus: "PENDING"
    });

    expect(checklist.find((item) => item.current)?.key).toBe(
      "profileReadyForPublish"
    );
    expect(checklist.find((item) => item.key === "workEmailVerified")?.done).toBe(
      true
    );
  });
});
