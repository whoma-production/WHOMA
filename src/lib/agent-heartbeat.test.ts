import { describe, expect, it } from "vitest";

import { getAgentHeartbeatChecklist } from "@/lib/agent-heartbeat";

describe("getAgentHeartbeatChecklist", () => {
  it("marks all milestones incomplete for a fresh state", () => {
    const checklist = getAgentHeartbeatChecklist({
      profileCompleteness: 12,
      historicDealsLogged: 0,
      liveDealsAdded: 0,
      profileLinksShared: 0,
      interactionsReceived: 0
    });

    expect(checklist.every((item) => item.done === false)).toBe(true);
    expect(checklist).toHaveLength(5);
  });

  it("marks all milestones complete once thresholds are met", () => {
    const checklist = getAgentHeartbeatChecklist({
      profileCompleteness: 85,
      historicDealsLogged: 2,
      liveDealsAdded: 1,
      profileLinksShared: 3,
      interactionsReceived: 1
    });

    expect(checklist.every((item) => item.done)).toBe(true);
  });
});
