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

export interface HomeownerInstructionSummary {
  id: string;
  status: "DRAFT" | "LIVE" | "CLOSED" | "SHORTLIST" | "AWARDED";
  addressLine1: string;
  city: string;
  postcode: string;
  propertyType: string;
  bedrooms: number;
  targetTimeline: string;
  bidWindowStartAtIso: string;
  bidWindowEndAtIso: string;
  createdAtIso: string;
  offersCount: number;
  shortlistedOffersCount: number;
  chosenOffersCount: number;
  contactUnlocked: boolean;
}

export interface AgentOfferSummary {
  id: string;
  status: "SUBMITTED" | "SHORTLISTED" | "REJECTED" | "ACCEPTED";
  feeModel: "FIXED" | "PERCENT" | "HYBRID" | "SUCCESS_BANDS";
  feeValue: number;
  timelineDays: number;
  createdAtIso: string;
  instruction: {
    id: string;
    status: "DRAFT" | "LIVE" | "CLOSED" | "SHORTLIST" | "AWARDED";
    addressLine1: string;
    city: string;
    postcode: string;
    propertyType: string;
    bedrooms: number;
    targetTimeline: string;
    bidWindowEndAtIso: string;
    totalOffersCount: number;
  };
  contactThreadStatus: "LOCKED" | "OPEN" | null;
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
  proposals: Array<{
    id: string;
  }>;
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

function shouldRestrictOfficialProductionData(): boolean {
  return process.env.NODE_ENV === "production";
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
  const restrictToProductionOrigin = shouldRestrictOfficialProductionData();

  const where: Prisma.InstructionWhereInput = {
    status: "LIVE",
    bidWindowEndAt: {
      gt: new Date()
    }
  };

  const propertyWhere: Prisma.PropertyWhereInput = {};

  if (restrictToProductionOrigin) {
    propertyWhere.owner = {
      is: {
        dataOrigin: "PRODUCTION"
      }
    };
  }

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

  const rows = await prisma.instruction.findMany({
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
      proposals: restrictToProductionOrigin
        ? {
            where: {
              agent: {
                is: {
                  dataOrigin: "PRODUCTION"
                }
              }
            },
            select: {
              id: true
            }
          }
        : {
            select: {
              id: true
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
  });

  return rows.map((row) => ({
    id: row.id,
    bidWindowEndAt: row.bidWindowEndAt,
    targetTimeline: row.targetTimeline,
    property: {
      city: row.property.city,
      postcode: row.property.postcode,
      propertyType: row.property.propertyType,
      bedrooms: row.property.bedrooms
    },
    proposals: row.proposals.map((proposal) => ({
      id: proposal.id
    }))
  }));
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
    proposalsCount: row.proposals.length,
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

export async function getHomeownerInstructionSummaries(
  homeownerUserId: string
): Promise<HomeownerInstructionSummary[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  const rows = await prisma.instruction.findMany({
    where: {
      property: {
        ownerId: homeownerUserId
      }
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      targetTimeline: true,
      bidWindowStartAt: true,
      bidWindowEndAt: true,
      createdAt: true,
      property: {
        select: {
          addressLine1: true,
          city: true,
          postcode: true,
          propertyType: true,
          bedrooms: true
        }
      },
      proposals: {
        select: {
          status: true
        }
      }
    }
  });

  return rows.map((row) => {
    const offersCount = row.proposals.length;
    const shortlistedOffersCount = row.proposals.filter((proposal) =>
      proposal.status === "SHORTLISTED" || proposal.status === "ACCEPTED"
    ).length;
    const chosenOffersCount = row.proposals.filter(
      (proposal) => proposal.status === "ACCEPTED"
    ).length;

    return {
      id: row.id,
      status: row.status,
      addressLine1: row.property.addressLine1,
      city: row.property.city,
      postcode: row.property.postcode,
      propertyType: propertyTypeLabels[row.property.propertyType],
      bedrooms: row.property.bedrooms,
      targetTimeline: targetTimelineLabels[row.targetTimeline],
      bidWindowStartAtIso: row.bidWindowStartAt.toISOString(),
      bidWindowEndAtIso: row.bidWindowEndAt.toISOString(),
      createdAtIso: row.createdAt.toISOString(),
      offersCount,
      shortlistedOffersCount,
      chosenOffersCount,
      contactUnlocked: shortlistedOffersCount > 0
    };
  });
}

export async function getAgentOfferSummaries(
  agentUserId: string
): Promise<AgentOfferSummary[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  const rows = await prisma.proposal.findMany({
    where: {
      agentId: agentUserId
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      feeModel: true,
      feeValue: true,
      timelineDays: true,
      createdAt: true,
      instruction: {
        select: {
          id: true,
          status: true,
          targetTimeline: true,
          bidWindowEndAt: true,
          property: {
            select: {
              addressLine1: true,
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
          },
          threads: {
            where: {
              agentId: agentUserId
            },
            select: {
              status: true
            },
            take: 1
          }
        }
      }
    }
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    feeModel: row.feeModel,
    feeValue: Number(row.feeValue),
    timelineDays: row.timelineDays,
    createdAtIso: row.createdAt.toISOString(),
    instruction: {
      id: row.instruction.id,
      status: row.instruction.status,
      addressLine1: row.instruction.property.addressLine1,
      city: row.instruction.property.city,
      postcode: row.instruction.property.postcode,
      propertyType: propertyTypeLabels[row.instruction.property.propertyType],
      bedrooms: row.instruction.property.bedrooms,
      targetTimeline: targetTimelineLabels[row.instruction.targetTimeline],
      bidWindowEndAtIso: row.instruction.bidWindowEndAt.toISOString(),
      totalOffersCount: row.instruction._count.proposals
    },
    contactThreadStatus: row.instruction.threads[0]?.status ?? null
  }));
}
