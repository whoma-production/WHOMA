import { proposalSubmissionSchema } from "@/lib/validation/proposal";

describe("proposalSubmissionSchema", () => {
  const baseProposal = {
    instructionId: "instr_123",
    feeModel: "FIXED" as const,
    feeValue: 1250,
    currency: "GBP" as const,
    inclusions: ["PROFESSIONAL_PHOTOGRAPHY", "FLOORPLAN"] as const,
    marketingPlan:
      "We will launch to our buyer database first, then push to major portals with a staged price-review cadence.",
    timelineDays: 42,
    cancellationTerms: "Rolling agreement with 14-day notice. No withdrawal fee after notice period."
  };

  it("accepts a structured comparable proposal", () => {
    const parsed = proposalSubmissionSchema.parse(baseProposal);
    expect(parsed.currency).toBe("GBP");
    expect(parsed.inclusions).toHaveLength(2);
  });

  it("rejects freeform-only submissions missing inclusions", () => {
    const result = proposalSubmissionSchema.safeParse({
      ...baseProposal,
      inclusions: [],
      marketingPlan: "Short text"
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Select at least one inclusion.");
      expect(messages.some((message) => message.includes("at least 40 characters"))).toBe(true);
    }
  });
});
