import { describe, expect, it } from "vitest";

import type { InstructionCardModel } from "@/components/instruction-card";
import {
  getLiveInstructionLocationSummaries,
  getLiveInstructionsByDistrict,
  getLocationDistrictParams,
  normalizePostcodeDistrictKey
} from "@/server/marketplace/queries";

const cards: InstructionCardModel[] = [
  {
    id: "ins_1",
    postcodeDistrict: "SW1A",
    city: "London",
    propertyType: "Flat",
    bedrooms: 2,
    sellerTimelineGoal: "ASAP",
    proposalsCount: 3,
    bidWindowEndAtIso: "2026-03-22T10:00:00.000Z"
  },
  {
    id: "ins_2",
    postcodeDistrict: "sw1a",
    city: "London",
    propertyType: "Terraced",
    bedrooms: 3,
    sellerTimelineGoal: "Flexible",
    proposalsCount: 1,
    bidWindowEndAtIso: "2026-03-22T12:00:00.000Z"
  },
  {
    id: "ins_3",
    postcodeDistrict: "M1",
    city: "Manchester",
    propertyType: "Detached",
    bedrooms: 4,
    sellerTimelineGoal: "4-8 weeks",
    proposalsCount: 5,
    bidWindowEndAtIso: "2026-03-22T09:00:00.000Z"
  },
  {
    id: "ins_4",
    postcodeDistrict: "UNKNOWN",
    city: "Nowhere",
    propertyType: "Other",
    bedrooms: 1,
    sellerTimelineGoal: "Flexible",
    proposalsCount: 2,
    bidWindowEndAtIso: "2026-03-22T09:00:00.000Z"
  }
];

describe("marketplace read helpers", () => {
  it("normalizes postcode district keys", () => {
    expect(normalizePostcodeDistrictKey(" sw1 a ")).toBe("SW1A");
  });

  it("groups location summaries by normalized postcode district", () => {
    expect(getLiveInstructionLocationSummaries(cards)).toEqual([
      {
        postcodeDistrict: "M1",
        city: "Manchester",
        instructionsCount: 1,
        totalProposalsCount: 5
      },
      {
        postcodeDistrict: "SW1A",
        city: "London",
        instructionsCount: 2,
        totalProposalsCount: 4
      }
    ]);
  });

  it("filters instructions by normalized postcode district", () => {
    expect(getLiveInstructionsByDistrict(cards, " sw1a ")).toHaveLength(2);
    expect(getLiveInstructionsByDistrict(cards, "M1")).toHaveLength(1);
  });

  it("derives location params from grouped summaries", () => {
    expect(getLocationDistrictParams(cards)).toEqual([
      { postcodeDistrict: "M1" },
      { postcodeDistrict: "SW1A" }
    ]);
  });
});
