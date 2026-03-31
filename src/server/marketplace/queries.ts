import type { Prisma, PropertyType, TargetTimeline } from "@prisma/client";

import type { InstructionCardModel } from "@/components/instruction-card";
import { extractPostcodeDistrict } from "@/lib/postcode";
import { prisma } from "@/lib/prisma";

export interface LocationInstructionSummary {
  postcodeDistrict: string;
  city: string;
  instructionsCount: number;
  totalProposalsCount: number;
}

export interface LiveInstructionFilters {
  postcodeDistrict?: string;
  propertyType?: string;
  bedrooms?: number;
}

interface LiveInstructionQueryRow {
  id: string;
  bidWindowEndAt: Date;
  targetTimeline: TargetTimeline;
  property: {
    city: string;
    postcode: string;
    propertyType: PropertyType;
    bedrooms: number;
  };
  _count: {
    proposals: number;
  };
}

const propertyTypeLabels: Record<PropertyType, string> = {
  FLAT: "Flat",
  TERRACED: "Terraced",
  SEMI_DETACHED: "Semi-detached",
  DETACHED: "Detached",
  BUNGALOW: "Bungalow",
  OTHER: "Other"
};

const targetTimelineLabels: Record<TargetTimeline, string> = {
  ASAP: "ASAP",
  FOUR_TO_EIGHT_WEEKS: "4-8 weeks",
  FLEXIBLE: "Flexible"
};

export function normalizePostcodeDistrictKey(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function mapPostcodeDistrict(postcode: string): string {
  const extractedDistrict = extractPostcodeDistrict(postcode);
  return extractedDistrict
    ? normalizePostcodeDistrictKey(extractedDistrict)
    : "UNKNOWN";
}

function parsePropertyTypeFilter(
  raw: string | undefined
): PropertyType | undefined {
  if (!raw) {
    return undefined;
  }

  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const allowed: readonly PropertyType[] = [
    "FLAT",
    "TERRACED",
    "SEMI_DETACHED",
    "DETACHED",
    "BUNGALOW",
    "OTHER"
  ];

  if (allowed.includes(normalized as PropertyType)) {
    return normalized as PropertyType;
  }

  return undefined;
}

async function readLiveInstructionRowsWithFilters(
  filters: LiveInstructionFilters
): Promise<LiveInstructionQueryRow[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  const normalizedDistrict = filters.postcodeDistrict
    ? normalizePostcodeDistrictKey(filters.postcodeDistrict)
    : undefined;

  const propertyType = parsePropertyTypeFilter(filters.propertyType);
  const bedrooms =
    typeof filters.bedrooms === "number" && Number.isFinite(filters.bedrooms)
      ? filters.bedrooms
      : undefined;

  const where: Prisma.InstructionWhereInput = {
    status: "LIVE",
    bidWindowEndAt: {
      gt: new Date()
    }
  };

  const propertyWhere: Prisma.PropertyWhereInput = {};

  if (normalizedDistrict) {
    propertyWhere.postcode = {
      startsWith: normalizedDistrict,
      mode: "insensitive"
    };
  }

  if (propertyType) {
    propertyWhere.propertyType = propertyType;
  }

  if (bedrooms !== undefined) {
    propertyWhere.bedrooms = bedrooms;
  }

  if (Object.keys(propertyWhere).length > 0) {
    where.property = {
      is: propertyWhere
    };
  }

  return prisma.instruction.findMany({
    where,
    select: {
      id: true,
      bidWindowEndAt: true,
      targetTimeline: true,
      property: {
        select: {
          city: true,
          postcode: true,
          propertyType: true,
          bedrooms: true
        }
      },
      _count: {
        select: {
          proposals: true
        }
      }
    },
    orderBy: [
      {
        bidWindowEndAt: "asc"
      },
      {
        createdAt: "desc"
      }
    ]
  }) as Promise<LiveInstructionQueryRow[]>;
}

export async function getLiveInstructionCards(
  filters: LiveInstructionFilters = {}
): Promise<InstructionCardModel[]> {
  const rows = await readLiveInstructionRowsWithFilters(filters);

  return rows.map((row) => ({
    id: row.id,
    postcodeDistrict: mapPostcodeDistrict(row.property.postcode),
    city: row.property.city,
    propertyType: propertyTypeLabels[row.property.propertyType],
    bedrooms: row.property.bedrooms,
    sellerTimelineGoal: targetTimelineLabels[row.targetTimeline],
    proposalsCount: row._count.proposals,
    bidWindowEndAtIso: row.bidWindowEndAt.toISOString()
  }));
}

export function getLiveInstructionLocationSummaries(
  instructions: InstructionCardModel[]
): LocationInstructionSummary[] {
  const grouped = new Map<string, LocationInstructionSummary>();

  for (const instruction of instructions) {
    const district = normalizePostcodeDistrictKey(instruction.postcodeDistrict);

    if (district === "UNKNOWN") {
      continue;
    }

    const existing = grouped.get(district);
    if (existing) {
      existing.instructionsCount += 1;
      existing.totalProposalsCount += instruction.proposalsCount;
      continue;
    }

    grouped.set(district, {
      postcodeDistrict: district,
      city: instruction.city,
      instructionsCount: 1,
      totalProposalsCount: instruction.proposalsCount
    });
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.postcodeDistrict.localeCompare(b.postcodeDistrict)
  );
}

export function getLiveInstructionsByDistrict(
  instructions: InstructionCardModel[],
  postcodeDistrict: string
): InstructionCardModel[] {
  const normalizedDistrict = normalizePostcodeDistrictKey(postcodeDistrict);

  return instructions.filter(
    (instruction) =>
      normalizePostcodeDistrictKey(instruction.postcodeDistrict) ===
      normalizedDistrict
  );
}

export function getLocationDistrictParams(
  instructions: InstructionCardModel[]
): Array<{ postcodeDistrict: string }> {
  return getLiveInstructionLocationSummaries(instructions).map((summary) => ({
    postcodeDistrict: summary.postcodeDistrict
  }));
}
