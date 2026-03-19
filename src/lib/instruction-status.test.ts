import {
  canTransitionInstructionStatus,
  deriveBidWindowPhase,
  validateBidWindowHours
} from "@/lib/instruction-status";

describe("instruction lifecycle", () => {
  it("allows only explicit workflow transitions", () => {
    expect(canTransitionInstructionStatus("DRAFT", "LIVE")).toBe(true);
    expect(canTransitionInstructionStatus("DRAFT", "AWARDED")).toBe(false);
    expect(canTransitionInstructionStatus("SHORTLIST", "AWARDED")).toBe(true);
    expect(canTransitionInstructionStatus("AWARDED", "LIVE")).toBe(false);
  });

  it("derives bid window phase based on time", () => {
    const start = new Date("2026-02-25T10:00:00Z");
    const end = new Date("2026-02-26T10:00:00Z");

    expect(deriveBidWindowPhase(start, end, new Date("2026-02-25T09:00:00Z"))).toBe("PRELIVE");
    expect(deriveBidWindowPhase(start, end, new Date("2026-02-25T11:00:00Z"))).toBe("LIVE");
    expect(deriveBidWindowPhase(start, end, new Date("2026-02-26T10:00:00Z"))).toBe("ENDED");
  });

  it("validates allowed bid window duration", () => {
    const start = new Date("2026-02-25T10:00:00Z");

    expect(
      validateBidWindowHours(start, new Date("2026-02-26T10:00:00Z"), 24, 48)
    ).toEqual({ ok: true });

    expect(
      validateBidWindowHours(start, new Date("2026-02-25T20:00:00Z"), 24, 48)
    ).toEqual({ ok: false, reason: "Bid window must be between 24 and 48 hours." });
  });
});
