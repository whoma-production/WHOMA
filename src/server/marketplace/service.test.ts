import { describe, expect, it } from "vitest";

import {
  assessProposalDecisionTransition,
  assessProposalSubmissionWindow,
  getMarketplaceHttpStatus,
  inferInstructionStatusForCreate,
  MarketplaceServiceError
} from "@/server/marketplace/service";

describe("marketplace service guards", () => {
  it("infers DRAFT status when bid window starts in the future", () => {
    const now = new Date("2026-03-21T10:00:00Z");
    const startAt = new Date("2026-03-22T10:00:00Z");
    const endAt = new Date("2026-03-23T10:00:00Z");

    expect(inferInstructionStatusForCreate(startAt, endAt, now)).toBe("DRAFT");
  });

  it("infers LIVE status when bid window already started", () => {
    const now = new Date("2026-03-21T10:00:00Z");
    const startAt = new Date("2026-03-21T09:00:00Z");
    const endAt = new Date("2026-03-22T09:00:00Z");

    expect(inferInstructionStatusForCreate(startAt, endAt, now)).toBe("LIVE");
  });

  it("rejects creating instructions with bid windows in the past", () => {
    const now = new Date("2026-03-21T10:00:00Z");
    const startAt = new Date("2026-03-19T10:00:00Z");
    const endAt = new Date("2026-03-20T10:00:00Z");

    expect(() =>
      inferInstructionStatusForCreate(startAt, endAt, now)
    ).toThrowError(MarketplaceServiceError);

    try {
      inferInstructionStatusForCreate(startAt, endAt, now);
    } catch (error) {
      expect(error).toBeInstanceOf(MarketplaceServiceError);
      expect((error as MarketplaceServiceError).code).toBe(
        "INVALID_BID_WINDOW"
      );
    }
  });

  it("allows proposal submission only when instruction is LIVE and window is active", () => {
    const window = {
      bidWindowStartAt: new Date("2026-03-21T09:00:00Z"),
      bidWindowEndAt: new Date("2026-03-22T09:00:00Z")
    };

    expect(
      assessProposalSubmissionWindow({
        instructionStatus: "LIVE",
        ...window,
        now: new Date("2026-03-21T10:00:00Z")
      })
    ).toEqual({ ok: true });

    expect(
      assessProposalSubmissionWindow({
        instructionStatus: "DRAFT",
        ...window,
        now: new Date("2026-03-21T10:00:00Z")
      })
    ).toEqual({
      ok: false,
      code: "INSTRUCTION_NOT_LIVE",
      message: "Instruction status DRAFT does not accept proposals."
    });
  });

  it("blocks proposal submission outside the active bid window", () => {
    expect(
      assessProposalSubmissionWindow({
        instructionStatus: "LIVE",
        bidWindowStartAt: new Date("2026-03-21T10:00:00Z"),
        bidWindowEndAt: new Date("2026-03-22T10:00:00Z"),
        now: new Date("2026-03-21T09:30:00Z")
      })
    ).toEqual({
      ok: false,
      code: "BID_WINDOW_NOT_OPEN",
      message: "Bid window has not opened yet."
    });

    expect(
      assessProposalSubmissionWindow({
        instructionStatus: "LIVE",
        bidWindowStartAt: new Date("2026-03-21T10:00:00Z"),
        bidWindowEndAt: new Date("2026-03-22T10:00:00Z"),
        now: new Date("2026-03-22T10:00:00Z")
      })
    ).toEqual({
      ok: false,
      code: "BID_WINDOW_CLOSED",
      message: "Bid window has closed."
    });
  });

  it("maps service errors to operational HTTP status codes", () => {
    expect(getMarketplaceHttpStatus("DATABASE_NOT_CONFIGURED")).toBe(503);
    expect(getMarketplaceHttpStatus("INSTRUCTION_NOT_FOUND")).toBe(404);
    expect(getMarketplaceHttpStatus("PROPOSAL_NOT_FOUND")).toBe(404);
    expect(getMarketplaceHttpStatus("MESSAGE_THREAD_NOT_FOUND")).toBe(404);
    expect(getMarketplaceHttpStatus("SELF_BIDDING_NOT_ALLOWED")).toBe(403);
    expect(getMarketplaceHttpStatus("DUPLICATE_PROPOSAL")).toBe(409);
    expect(getMarketplaceHttpStatus("MESSAGE_THREAD_LOCKED")).toBe(409);
    expect(getMarketplaceHttpStatus("PROPOSAL_DECISION_NOT_ALLOWED")).toBe(409);
    expect(getMarketplaceHttpStatus("INSTRUCTION_ALREADY_AWARDED")).toBe(409);
    expect(getMarketplaceHttpStatus("AWARD_REQUIRES_SHORTLIST")).toBe(409);
    expect(getMarketplaceHttpStatus("INVALID_BID_WINDOW")).toBe(400);
  });

  it("shortlists only submitted proposals and advances instruction state", () => {
    expect(
      assessProposalDecisionTransition({
        action: "SHORTLIST",
        proposalId: "proposal-1",
        proposalStatus: "SUBMITTED",
        instructionStatus: "LIVE",
        acceptedProposalId: null,
        acceptedProposalCount: 0
      })
    ).toEqual({
      ok: true,
      alreadyApplied: false,
      proposalStatus: "SHORTLISTED",
      instructionStatus: "SHORTLIST",
      trackEventName: "proposal_shortlisted"
    });

    expect(
      assessProposalDecisionTransition({
        action: "SHORTLIST",
        proposalId: "proposal-2",
        proposalStatus: "SHORTLISTED",
        instructionStatus: "SHORTLIST",
        acceptedProposalId: "proposal-1",
        acceptedProposalCount: 1
      })
    ).toEqual({
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded to another proposal."
    });

    expect(
      assessProposalDecisionTransition({
        action: "SHORTLIST",
        proposalId: "proposal-1",
        proposalStatus: "SHORTLISTED",
        instructionStatus: "SHORTLIST",
        acceptedProposalId: null,
        acceptedProposalCount: 0
      })
    ).toEqual({
      ok: true,
      alreadyApplied: true,
      proposalStatus: "SHORTLISTED",
      instructionStatus: "SHORTLIST",
      trackEventName: null
    });
  });

  it("rejects only submitted or shortlisted proposals", () => {
    expect(
      assessProposalDecisionTransition({
        action: "REJECT",
        proposalId: "proposal-1",
        proposalStatus: "SHORTLISTED",
        instructionStatus: "SHORTLIST",
        acceptedProposalId: null,
        acceptedProposalCount: 0
      })
    ).toEqual({
      ok: true,
      alreadyApplied: false,
      proposalStatus: "REJECTED",
      instructionStatus: "SHORTLIST",
      trackEventName: null
    });

    expect(
      assessProposalDecisionTransition({
        action: "REJECT",
        proposalId: "proposal-1",
        proposalStatus: "ACCEPTED",
        instructionStatus: "AWARDED",
        acceptedProposalId: "proposal-1",
        acceptedProposalCount: 1
      })
    ).toEqual({
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded."
    });
  });

  it("awards only shortlisted proposals and enforces exclusivity", () => {
    expect(
      assessProposalDecisionTransition({
        action: "AWARD",
        proposalId: "proposal-1",
        proposalStatus: "SHORTLISTED",
        instructionStatus: "SHORTLIST",
        acceptedProposalId: null,
        acceptedProposalCount: 0
      })
    ).toEqual({
      ok: true,
      alreadyApplied: false,
      proposalStatus: "ACCEPTED",
      instructionStatus: "AWARDED",
      trackEventName: "proposal_awarded"
    });

    expect(
      assessProposalDecisionTransition({
        action: "AWARD",
        proposalId: "proposal-1",
        proposalStatus: "SUBMITTED",
        instructionStatus: "SHORTLIST",
        acceptedProposalId: null,
        acceptedProposalCount: 0
      })
    ).toEqual({
      ok: false,
      code: "AWARD_REQUIRES_SHORTLIST",
      message: "Only shortlisted proposals can be awarded."
    });

    expect(
      assessProposalDecisionTransition({
        action: "AWARD",
        proposalId: "proposal-2",
        proposalStatus: "SHORTLISTED",
        instructionStatus: "SHORTLIST",
        acceptedProposalId: "proposal-1",
        acceptedProposalCount: 1
      })
    ).toEqual({
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded to another proposal."
    });

    expect(
      assessProposalDecisionTransition({
        action: "AWARD",
        proposalId: "proposal-1",
        proposalStatus: "ACCEPTED",
        instructionStatus: "AWARDED",
        acceptedProposalId: "proposal-1",
        acceptedProposalCount: 1
      })
    ).toEqual({
      ok: true,
      alreadyApplied: true,
      proposalStatus: "ACCEPTED",
      instructionStatus: "AWARDED",
      trackEventName: null
    });

    expect(
      assessProposalDecisionTransition({
        action: "AWARD",
        proposalId: "proposal-1",
        proposalStatus: "ACCEPTED",
        instructionStatus: "AWARDED",
        acceptedProposalId: "proposal-1",
        acceptedProposalCount: 2
      })
    ).toEqual({
      ok: false,
      code: "INSTRUCTION_ALREADY_AWARDED",
      message: "This instruction has already been awarded to another proposal."
    });
  });
});
