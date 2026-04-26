import { describe, expect, it } from "vitest";

import { retrieveRelevantKnowledge } from "@/lib/knowledge/retrieve";

describe("retrieveRelevantKnowledge", () => {
  it("returns matching support sections for a relevant query", () => {
    const knowledge = retrieveRelevantKnowledge(
      "What happens when a seller disputes a past deal verification?"
    );

    expect(knowledge).toContain("[past-deals]");
    expect(knowledge).toContain("## What happens if the seller disputes it?");
    expect(knowledge).toContain("marked as disputed");
  });

  it("returns an empty string when no support sections match", () => {
    const knowledge = retrieveRelevantKnowledge("Tokyo weather forecast tomorrow");

    expect(knowledge).toBe("");
  });
});
