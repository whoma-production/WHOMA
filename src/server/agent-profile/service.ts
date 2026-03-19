import type { Prisma, VerificationStatus } from "@prisma/client";
import { AgentProfileStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AgentOnboardingInput, AgentProfileDraftInput, AgentProfilePublishInput } from "@/lib/validation/agent-profile";

const MIN_PUBLISH_COMPLETENESS = 70;

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.slice(0, 60) || "agent-profile";
}

async function buildUniqueSlug(base: string, userId: string): Promise<string> {
  const root = slugify(base);

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? root : `${root}-${suffix + 1}`;
    const existing = await prisma.agentProfile.findFirst({
      where: {
        profileSlug: candidate,
        NOT: { userId }
      },
      select: { userId: true }
    });

    if (!existing) {
      return candidate;
    }
  }

  return `${root}-${Date.now()}`;
}

export function calculateAgentProfileCompleteness(profile: {
  agencyName?: string | null;
  jobTitle?: string | null;
  workEmail?: string | null;
  phone?: string | null;
  yearsExperience?: number | null;
  bio?: string | null;
  serviceAreas?: string[] | null;
  specialties?: string[] | null;
  achievements?: string[] | null;
  languages?: string[] | null;
}): number {
  const checks = [
    Boolean(profile.agencyName?.trim()),
    Boolean(profile.jobTitle?.trim()),
    Boolean(profile.workEmail?.trim()),
    Boolean(profile.phone?.trim()),
    profile.yearsExperience !== null && profile.yearsExperience !== undefined,
    Boolean(profile.bio && profile.bio.trim().length >= 80),
    Boolean(profile.serviceAreas && profile.serviceAreas.length >= 1),
    Boolean(profile.specialties && profile.specialties.length >= 2),
    Boolean(profile.achievements && profile.achievements.length >= 1),
    Boolean(profile.languages && profile.languages.length >= 1)
  ];

  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

type AgentProfileWithUser = Prisma.AgentProfileGetPayload<{
  include: { user: { select: { id: true; name: true; image: true } } };
}>;

function mapAgentProfile(profile: AgentProfileWithUser): AgentProfileWithUser {
  return profile;
}

export async function completeAgentOnboarding(userId: string, input: AgentOnboardingInput): Promise<AgentProfileWithUser> {
  const slug = await buildUniqueSlug(`${input.fullName}-${input.agencyName}`, userId);
  const completeness = calculateAgentProfileCompleteness({
    agencyName: input.agencyName,
    jobTitle: input.jobTitle,
    workEmail: input.workEmail,
    phone: input.phone,
    yearsExperience: input.yearsExperience,
    bio: input.bio,
    serviceAreas: input.serviceAreas,
    specialties: input.specialties,
    achievements: [],
    languages: []
  });

  await prisma.user.update({
    where: { id: userId },
    data: { name: input.fullName }
  });

  const profile = await prisma.agentProfile.upsert({
    where: { userId },
    create: {
      userId,
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: input.workEmail,
      phone: input.phone,
      bio: input.bio,
      yearsExperience: input.yearsExperience,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: [],
      languages: [],
      profileSlug: slug,
      profileStatus: AgentProfileStatus.DRAFT,
      profileCompleteness: completeness,
      verificationStatus: "PENDING",
      onboardingCompletedAt: new Date()
    },
    update: {
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: input.workEmail,
      phone: input.phone,
      bio: input.bio,
      yearsExperience: input.yearsExperience,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.DRAFT,
      profileCompleteness: completeness,
      verificationStatus: "PENDING",
      onboardingCompletedAt: new Date()
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  return mapAgentProfile(profile);
}

export async function saveAgentProfileDraft(userId: string, input: AgentProfileDraftInput): Promise<AgentProfileWithUser> {
  const existing = await prisma.agentProfile.findUnique({
    where: { userId },
    select: { profileSlug: true, user: { select: { name: true } } }
  });

  const slug = existing?.profileSlug ?? (await buildUniqueSlug(`${existing?.user.name ?? "agent"}-${input.agencyName}`, userId));
  const completeness = calculateAgentProfileCompleteness(input);

  const profile = await prisma.agentProfile.upsert({
    where: { userId },
    create: {
      userId,
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: input.workEmail,
      phone: input.phone,
      yearsExperience: input.yearsExperience,
      bio: input.bio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.DRAFT,
      profileCompleteness: completeness
    },
    update: {
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: input.workEmail,
      phone: input.phone,
      yearsExperience: input.yearsExperience,
      bio: input.bio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.DRAFT,
      profileCompleteness: completeness
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  return mapAgentProfile(profile);
}

export async function publishAgentProfile(userId: string, input: AgentProfilePublishInput): Promise<AgentProfileWithUser> {
  const saved = await saveAgentProfileDraft(userId, input);

  if (saved.profileCompleteness < MIN_PUBLISH_COMPLETENESS) {
    throw new Error(`Profile completeness must be at least ${MIN_PUBLISH_COMPLETENESS}% before publishing.`);
  }

  const profile = await prisma.agentProfile.update({
    where: { userId },
    data: {
      profileStatus: AgentProfileStatus.PUBLISHED,
      publishedAt: new Date()
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  return mapAgentProfile(profile);
}

export async function getAgentProfileByUserId(userId: string): Promise<AgentProfileWithUser | null> {
  const profile = await prisma.agentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  return profile ? mapAgentProfile(profile) : null;
}

export async function getPublicAgentProfileBySlug(slug: string): Promise<AgentProfileWithUser | null> {
  const profile = await prisma.agentProfile.findFirst({
    where: {
      profileSlug: slug,
      profileStatus: AgentProfileStatus.PUBLISHED
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  return profile ? mapAgentProfile(profile) : null;
}

export async function listPublicAgentProfiles(filters: {
  serviceArea?: string | null;
  specialty?: string | null;
  verifiedOnly?: boolean;
  limit?: number;
}): Promise<AgentProfileWithUser[]> {
  const profiles = await prisma.agentProfile.findMany({
    where: {
      profileStatus: AgentProfileStatus.PUBLISHED,
      ...(filters.verifiedOnly ? { verificationStatus: "VERIFIED" } : {}),
      ...(filters.serviceArea ? { serviceAreas: { has: filters.serviceArea.toUpperCase() } } : {}),
      ...(filters.specialty ? { specialties: { has: filters.specialty } } : {})
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: [{ verificationStatus: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: filters.limit ?? 100
  });

  return profiles.map(mapAgentProfile);
}

export async function setAgentVerificationStatus(userId: string, status: VerificationStatus): Promise<void> {
  await prisma.agentProfile.update({
    where: { userId },
    data: { verificationStatus: status }
  });
}

export async function listAgentProfilesForVerification(limit = 200): Promise<AgentProfileWithUser[]> {
  const profiles = await prisma.agentProfile.findMany({
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: [{ verificationStatus: "asc" }, { onboardingCompletedAt: "desc" }, { createdAt: "desc" }],
    take: limit
  });

  return profiles.map(mapAgentProfile);
}

export async function getAgentOnboardingFunnelCounts(): Promise<{
  started: number;
  completed: number;
  published: number;
  verified: number;
}> {
  const [started, completed, published, verified] = await Promise.all([
    prisma.agentProfile.count(),
    prisma.agentProfile.count({
      where: { onboardingCompletedAt: { not: null } }
    }),
    prisma.agentProfile.count({
      where: { profileStatus: AgentProfileStatus.PUBLISHED }
    }),
    prisma.agentProfile.count({
      where: { verificationStatus: "VERIFIED" }
    })
  ]);

  return { started, completed, published, verified };
}
