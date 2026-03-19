import type { InstructionCardModel } from "@/components/instruction-card";

export const mockLiveInstructions: InstructionCardModel[] = [
  {
    id: "ins_1",
    postcodeDistrict: "SW1A",
    city: "London",
    propertyType: "Flat",
    bedrooms: 2,
    sellerTimelineGoal: "ASAP",
    proposalsCount: 3,
    bidWindowEndAtIso: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "ins_2",
    postcodeDistrict: "M1",
    city: "Manchester",
    propertyType: "Terraced",
    bedrooms: 3,
    sellerTimelineGoal: "4-8 weeks",
    proposalsCount: 1,
    bidWindowEndAtIso: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "ins_3",
    postcodeDistrict: "BS1",
    city: "Bristol",
    propertyType: "Detached",
    bedrooms: 4,
    sellerTimelineGoal: "Flexible",
    proposalsCount: 5,
    bidWindowEndAtIso: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "ins_4",
    postcodeDistrict: "SW1A",
    city: "London",
    propertyType: "Semi-detached",
    bedrooms: 4,
    sellerTimelineGoal: "Flexible",
    proposalsCount: 2,
    bidWindowEndAtIso: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  }
];

export interface LocationInstructionSummary {
  postcodeDistrict: string;
  city: string;
  instructionsCount: number;
  totalProposalsCount: number;
}

export function normalizePostcodeDistrictKey(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function getLiveInstructionsByDistrict(postcodeDistrict: string): InstructionCardModel[] {
  const normalizedDistrict = normalizePostcodeDistrictKey(postcodeDistrict);

  return mockLiveInstructions.filter(
    (instruction) => normalizePostcodeDistrictKey(instruction.postcodeDistrict) === normalizedDistrict
  );
}

export function getLiveInstructionLocationSummaries(): LocationInstructionSummary[] {
  const grouped = new Map<string, LocationInstructionSummary>();

  for (const instruction of mockLiveInstructions) {
    const key = normalizePostcodeDistrictKey(instruction.postcodeDistrict);
    const existing = grouped.get(key);

    if (existing) {
      existing.instructionsCount += 1;
      existing.totalProposalsCount += instruction.proposalsCount;
      continue;
    }

    grouped.set(key, {
      postcodeDistrict: instruction.postcodeDistrict,
      city: instruction.city,
      instructionsCount: 1,
      totalProposalsCount: instruction.proposalsCount
    });
  }

  return Array.from(grouped.values()).sort((a, b) => a.postcodeDistrict.localeCompare(b.postcodeDistrict));
}

export function getLocationDistrictParams(): Array<{ postcodeDistrict: string }> {
  return getLiveInstructionLocationSummaries().map((summary) => ({
    postcodeDistrict: summary.postcodeDistrict
  }));
}
