import crypto from "node:crypto";

import type { Prisma, VerificationStatus } from "@prisma/client";
import { AgentProfileStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { AgentOnboardingInput, AgentProfileDraftInput, AgentProfilePublishInput } from "@/lib/validation/agent-profile";

const MIN_PUBLISH_COMPLETENESS = 70;
const WORK_EMAIL_VERIFICATION_CODE_TTL_MINUTES = 15;

export type WorkEmailVerificationErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "CODE_NOT_REQUESTED"
  | "CODE_EXPIRED"
  | "CODE_INVALID"
  | "EMAIL_MISMATCH";

export class WorkEmailVerificationError extends Error {
  readonly code: WorkEmailVerificationErrorCode;

  constructor(code: WorkEmailVerificationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "WorkEmailVerificationError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeTextValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizeStringList(values: string[] | null | undefined): string[] {
  return [...(values ?? [])]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function stringListsEqual(left: string[] | null | undefined, right: string[] | null | undefined): boolean {
  const normalizedLeft = normalizeStringList(left);
  const normalizedRight = normalizeStringList(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

type TrustComparableProfileFields = {
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
};

function hasMaterialProfileChanges(
  existing: TrustComparableProfileFields,
  next: AgentProfileDraftInput | AgentProfilePublishInput,
  normalizedWorkEmail: string
): boolean {
  if (normalizeTextValue(existing.agencyName) !== normalizeTextValue(next.agencyName)) {
    return true;
  }

  if (normalizeTextValue(existing.jobTitle) !== normalizeTextValue(next.jobTitle)) {
    return true;
  }

  if (normalizeEmail(existing.workEmail ?? "") !== normalizedWorkEmail) {
    return true;
  }

  if (normalizeTextValue(existing.phone) !== normalizeTextValue(next.phone)) {
    return true;
  }

  if ((existing.yearsExperience ?? null) !== (next.yearsExperience ?? null)) {
    return true;
  }

  if (normalizeTextValue(existing.bio) !== normalizeTextValue(next.bio)) {
    return true;
  }

  if (!stringListsEqual(existing.serviceAreas, next.serviceAreas)) {
    return true;
  }

  if (!stringListsEqual(existing.specialties, next.specialties)) {
    return true;
  }

  if (!stringListsEqual(existing.achievements, next.achievements)) {
    return true;
  }

  if (!stringListsEqual(existing.languages, next.languages)) {
    return true;
  }

  return false;
}

function hashWorkEmailVerificationCode(workEmail: string, code: string): string {
  const salt = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "whoma-work-email-verification";
  return crypto
    .createHash("sha256")
    .update(`${normalizeEmail(workEmail)}:${code}:${salt}`)
    .digest("hex");
}

function createVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

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
  const existingProfile = await prisma.agentProfile.findUnique({
    where: { userId },
    select: { profileSlug: true, workEmail: true, workEmailVerifiedAt: true }
  });

  const normalizedWorkEmail = normalizeEmail(input.workEmail);
  const hasVerifiedWorkEmail =
    Boolean(existingProfile?.workEmailVerifiedAt) &&
    normalizeEmail(existingProfile?.workEmail ?? "") === normalizedWorkEmail;

  if (!hasVerifiedWorkEmail) {
    throw new WorkEmailVerificationError(
      "EMAIL_NOT_VERIFIED",
      "Verify your business work email before completing onboarding."
    );
  }

  const slug = existingProfile?.profileSlug ?? (await buildUniqueSlug(`${input.fullName}-${input.agencyName}`, userId));
  const completeness = calculateAgentProfileCompleteness({
    agencyName: input.agencyName,
    jobTitle: input.jobTitle,
    workEmail: normalizedWorkEmail,
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
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: existingProfile?.workEmailVerifiedAt ?? null,
      workEmailVerificationCodeHash: null,
      workEmailVerificationCodeExpiresAt: null,
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
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: existingProfile?.workEmailVerifiedAt ?? null,
      workEmailVerificationCodeHash: null,
      workEmailVerificationCodeExpiresAt: null,
      phone: input.phone,
      bio: input.bio,
      yearsExperience: input.yearsExperience,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      profileSlug: slug,
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
    select: {
      profileSlug: true,
      workEmail: true,
      workEmailVerifiedAt: true,
      verificationStatus: true,
      agencyName: true,
      jobTitle: true,
      phone: true,
      yearsExperience: true,
      bio: true,
      serviceAreas: true,
      specialties: true,
      achievements: true,
      languages: true,
      user: { select: { name: true } }
    }
  });

  const slug = existing?.profileSlug ?? (await buildUniqueSlug(`${existing?.user.name ?? "agent"}-${input.agencyName}`, userId));
  const normalizedWorkEmail = normalizeEmail(input.workEmail);
  const workEmailChanged =
    Boolean(existing?.workEmail) && normalizeEmail(existing?.workEmail ?? "") !== normalizedWorkEmail;
  const requiresReverification =
    existing?.verificationStatus === "VERIFIED" &&
    hasMaterialProfileChanges(existing, input, normalizedWorkEmail);
  const completeness = calculateAgentProfileCompleteness({ ...input, workEmail: normalizedWorkEmail });

  const profile = await prisma.agentProfile.upsert({
    where: { userId },
    create: {
      userId,
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: null,
      workEmailVerificationCodeHash: null,
      workEmailVerificationCodeExpiresAt: null,
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
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: workEmailChanged ? null : existing?.workEmailVerifiedAt ?? null,
      ...(workEmailChanged ? { workEmailVerificationCodeHash: null, workEmailVerificationCodeExpiresAt: null } : {}),
      phone: input.phone,
      yearsExperience: input.yearsExperience,
      bio: input.bio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.DRAFT,
      profileCompleteness: completeness,
      ...(requiresReverification ? { verificationStatus: "PENDING" as const } : {})
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
  const existing = await prisma.agentProfile.findUnique({
    where: { userId },
    select: {
      profileSlug: true,
      workEmail: true,
      workEmailVerifiedAt: true,
      verificationStatus: true,
      agencyName: true,
      jobTitle: true,
      phone: true,
      yearsExperience: true,
      bio: true,
      serviceAreas: true,
      specialties: true,
      achievements: true,
      languages: true,
      user: { select: { name: true } }
    }
  });
  const normalizedWorkEmail = normalizeEmail(input.workEmail);
  const hasVerifiedWorkEmail =
    Boolean(existing?.workEmailVerifiedAt) &&
    normalizeEmail(existing?.workEmail ?? "") === normalizedWorkEmail;
  const requiresReverification =
    existing?.verificationStatus === "VERIFIED" &&
    hasMaterialProfileChanges(existing, input, normalizedWorkEmail);

  if (!hasVerifiedWorkEmail) {
    throw new WorkEmailVerificationError(
      "EMAIL_NOT_VERIFIED",
      "Verify your business work email before publishing your profile."
    );
  }

  const slug = existing?.profileSlug ?? (await buildUniqueSlug(`${existing?.user.name ?? "agent"}-${input.agencyName}`, userId));
  const completeness = calculateAgentProfileCompleteness({ ...input, workEmail: normalizedWorkEmail });

  if (completeness < MIN_PUBLISH_COMPLETENESS) {
    throw new Error(`Profile completeness must be at least ${MIN_PUBLISH_COMPLETENESS}% before publishing.`);
  }

  const profile = await prisma.agentProfile.upsert({
    where: { userId },
    create: {
      userId,
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: existing?.workEmailVerifiedAt ?? null,
      workEmailVerificationCodeHash: null,
      workEmailVerificationCodeExpiresAt: null,
      phone: input.phone,
      yearsExperience: input.yearsExperience,
      bio: input.bio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.PUBLISHED,
      profileCompleteness: completeness,
      verificationStatus: "PENDING",
      publishedAt: new Date()
    },
    update: {
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: existing?.workEmailVerifiedAt ?? null,
      workEmailVerificationCodeHash: null,
      workEmailVerificationCodeExpiresAt: null,
      phone: input.phone,
      yearsExperience: input.yearsExperience,
      bio: input.bio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.PUBLISHED,
      profileCompleteness: completeness,
      ...(requiresReverification ? { verificationStatus: "PENDING" as const } : {}),
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
      profileStatus: AgentProfileStatus.PUBLISHED,
      verificationStatus: "VERIFIED"
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
  limit?: number;
}): Promise<AgentProfileWithUser[]> {
  const normalizedSpecialty = filters.specialty?.trim().toLowerCase();
  const profiles = await prisma.agentProfile.findMany({
    where: {
      profileStatus: AgentProfileStatus.PUBLISHED,
      verificationStatus: "VERIFIED",
      ...(filters.serviceArea ? { serviceAreas: { has: filters.serviceArea.toUpperCase() } } : {})
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: [{ verificationStatus: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }]
  });

  const filteredProfiles = normalizedSpecialty
    ? profiles.filter((profile) => profile.specialties.some((specialty) => specialty.toLowerCase().includes(normalizedSpecialty)))
    : profiles;

  return filteredProfiles.slice(0, filters.limit ?? 100).map(mapAgentProfile);
}

export async function requestAgentWorkEmailVerificationCode(userId: string, workEmail: string): Promise<{
  expiresAt: Date;
  devCode?: string;
}> {
  const normalizedWorkEmail = normalizeEmail(workEmail);
  const verificationCode = createVerificationCode();
  const verificationCodeHash = hashWorkEmailVerificationCode(normalizedWorkEmail, verificationCode);
  const expiresAt = new Date(Date.now() + WORK_EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

  const existing = await prisma.agentProfile.findUnique({
    where: { userId },
    select: { workEmail: true, workEmailVerifiedAt: true }
  });
  const workEmailChanged =
    Boolean(existing?.workEmail) && normalizeEmail(existing?.workEmail ?? "") !== normalizedWorkEmail;

  await prisma.agentProfile.upsert({
    where: { userId },
    create: {
      userId,
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: null,
      workEmailVerificationCodeHash: verificationCodeHash,
      workEmailVerificationCodeExpiresAt: expiresAt
    },
    update: {
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: workEmailChanged ? null : existing?.workEmailVerifiedAt ?? null,
      workEmailVerificationCodeHash: verificationCodeHash,
      workEmailVerificationCodeExpiresAt: expiresAt
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(`[WHOMA] Work email verification code for ${normalizedWorkEmail}: ${verificationCode}`);
  }

  return {
    expiresAt,
    ...(process.env.NODE_ENV !== "production" ? { devCode: verificationCode } : {})
  };
}

export async function confirmAgentWorkEmailVerificationCode(
  userId: string,
  workEmail: string,
  verificationCode: string
): Promise<void> {
  const normalizedWorkEmail = normalizeEmail(workEmail);
  const profile = await prisma.agentProfile.findUnique({
    where: { userId },
    select: {
      workEmail: true,
      workEmailVerificationCodeHash: true,
      workEmailVerificationCodeExpiresAt: true
    }
  });

  if (
    !profile?.workEmailVerificationCodeHash ||
    !profile.workEmailVerificationCodeExpiresAt
  ) {
    throw new WorkEmailVerificationError(
      "CODE_NOT_REQUESTED",
      "Request a verification code before verifying your work email."
    );
  }

  if (normalizeEmail(profile.workEmail ?? "") !== normalizedWorkEmail) {
    throw new WorkEmailVerificationError(
      "EMAIL_MISMATCH",
      "The verification code was requested for a different work email address."
    );
  }

  if (profile.workEmailVerificationCodeExpiresAt < new Date()) {
    throw new WorkEmailVerificationError(
      "CODE_EXPIRED",
      "That verification code has expired. Request a new code."
    );
  }

  const expectedHash = hashWorkEmailVerificationCode(normalizedWorkEmail, verificationCode);
  if (expectedHash !== profile.workEmailVerificationCodeHash) {
    throw new WorkEmailVerificationError(
      "CODE_INVALID",
      "The verification code is invalid."
    );
  }

  await prisma.agentProfile.update({
    where: { userId },
    data: {
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: new Date(),
      workEmailVerificationCodeHash: null,
      workEmailVerificationCodeExpiresAt: null
    }
  });
}

export async function isAgentWorkEmailVerified(
  userId: string,
  workEmail: string
): Promise<boolean> {
  const normalizedWorkEmail = normalizeEmail(workEmail);
  const profile = await prisma.agentProfile.findUnique({
    where: { userId },
    select: { workEmail: true, workEmailVerifiedAt: true }
  });

  if (!profile?.workEmailVerifiedAt || !profile.workEmail) {
    return false;
  }

  return normalizeEmail(profile.workEmail) === normalizedWorkEmail;
}

export async function setAgentVerificationStatus(userId: string, status: VerificationStatus): Promise<void> {
  if (status === "VERIFIED") {
    const profile = await prisma.agentProfile.findUnique({
      where: { userId },
      select: { profileStatus: true, profileCompleteness: true }
    });

    if (!profile || profile.profileStatus !== AgentProfileStatus.PUBLISHED || profile.profileCompleteness < MIN_PUBLISH_COMPLETENESS) {
      throw new Error("Only published profiles meeting completeness requirements can be verified.");
    }
  }

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
