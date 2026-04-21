import crypto from "node:crypto";

import type {
  AgentFeePreference,
  AgentTransactionBand,
  CollaborationPreference,
  Prisma,
  VerificationStatus
} from "@prisma/client";
import { AgentProfileStatus } from "@prisma/client";

import { MIN_AGENT_PUBLISH_COMPLETENESS } from "@/lib/agent-activation";
import { prisma } from "@/lib/prisma";
import type {
  AgentOnboardingInput,
  AgentProfileDraftInput,
  AgentProfilePublishInput
} from "@/lib/validation/agent-profile";
import { trackEvent } from "@/server/analytics";
import {
  sendWorkEmailVerificationCodeEmail,
  WorkEmailDeliveryError
} from "@/server/agent-profile/work-email-delivery";
import { PRODUCT_EVENT_NAMES } from "@/server/product-events";

const WORK_EMAIL_VERIFICATION_CODE_TTL_MINUTES = 15;

function parsePositiveIntEnvValue(
  rawValue: string | undefined,
  fallbackValue: number
): number {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
}

const WORK_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS =
  parsePositiveIntEnvValue(
    process.env.WORK_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    60
  );
const WORK_EMAIL_VERIFICATION_MAX_ATTEMPTS = parsePositiveIntEnvValue(
  process.env.WORK_EMAIL_VERIFICATION_MAX_ATTEMPTS,
  5
);
const WORK_EMAIL_VERIFICATION_LOCK_MINUTES = parsePositiveIntEnvValue(
  process.env.WORK_EMAIL_VERIFICATION_LOCK_MINUTES,
  15
);

export type WorkEmailVerificationErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "CODE_NOT_REQUESTED"
  | "CODE_EXPIRED"
  | "CODE_INVALID"
  | "EMAIL_MISMATCH"
  | "RESEND_COOLDOWN"
  | "ATTEMPTS_EXCEEDED"
  | "EMAIL_DELIVERY_UNAVAILABLE";

export class WorkEmailVerificationError extends Error {
  readonly code: WorkEmailVerificationErrorCode;
  readonly details?: unknown;

  constructor(
    code: WorkEmailVerificationErrorCode,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.name = "WorkEmailVerificationError";
    this.details = details;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeTextValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function toNullableString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: number | undefined): number | null {
  return value ?? null;
}

function optionalEnumEqual<T extends string>(
  left: T | null | undefined,
  right: T | null | undefined
): boolean {
  return (left ?? null) === (right ?? null);
}

function normalizeStringList(values: string[] | null | undefined): string[] {
  return [...(values ?? [])]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function stringListsEqual(
  left: string[] | null | undefined,
  right: string[] | null | undefined
): boolean {
  const normalizedLeft = normalizeStringList(left);
  const normalizedRight = normalizeStringList(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every(
    (value, index) => value === normalizedRight[index]
  );
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
  feePreference?: AgentFeePreference | null;
  transactionBand?: AgentTransactionBand | null;
  collaborationPreference?: CollaborationPreference | null;
  responseTimeMinutes?: number | null;
};

function hasMaterialProfileChanges(
  existing: TrustComparableProfileFields,
  next: AgentProfileDraftInput | AgentProfilePublishInput,
  normalizedWorkEmail: string
): boolean {
  if (
    normalizeTextValue(existing.agencyName) !==
    normalizeTextValue(next.agencyName)
  ) {
    return true;
  }

  if (
    normalizeTextValue(existing.jobTitle) !== normalizeTextValue(next.jobTitle)
  ) {
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

  if (!optionalEnumEqual(existing.feePreference, next.feePreference)) {
    return true;
  }

  if (!optionalEnumEqual(existing.transactionBand, next.transactionBand)) {
    return true;
  }

  if (
    !optionalEnumEqual(
      existing.collaborationPreference,
      next.collaborationPreference
    )
  ) {
    return true;
  }

  if ((existing.responseTimeMinutes ?? null) !== (next.responseTimeMinutes ?? null)) {
    return true;
  }

  return false;
}

function hashWorkEmailVerificationCode(
  workEmail: string,
  code: string
): string {
  const salt =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "whoma-work-email-verification";
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
  feePreference?: AgentFeePreference | null;
  transactionBand?: AgentTransactionBand | null;
  collaborationPreference?: CollaborationPreference | null;
  responseTimeMinutes?: number | null;
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
  const baseCompleteness = Math.round((passed / checks.length) * 100);
  const optionalSignals = [
    Boolean(profile.feePreference),
    Boolean(profile.transactionBand),
    Boolean(profile.collaborationPreference),
    profile.responseTimeMinutes !== null &&
      profile.responseTimeMinutes !== undefined
  ];
  const optionalCompleted = optionalSignals.filter(Boolean).length;
  const optionalBonus =
    optionalSignals.length > 0
      ? Math.round((optionalCompleted / optionalSignals.length) * 10)
      : 0;

  return Math.min(100, baseCompleteness + optionalBonus);
}

type AgentProfileWithUser = Prisma.AgentProfileGetPayload<{
  include: { user: { select: { id: true; name: true; image: true } } };
}>;

function mapAgentProfile(profile: AgentProfileWithUser): AgentProfileWithUser {
  return profile;
}

export type PublicProofLedgerStatusLabel =
  | "Logged signal"
  | "Verified milestone";

export interface PublicProofLedgerEntry {
  id: string;
  title: string;
  detail: string;
  sourceLabel: string;
  statusLabel: PublicProofLedgerStatusLabel;
  occurredAt: Date;
}

export type PublicAgentProfile = AgentProfileWithUser & {
  proofLedger: PublicProofLedgerEntry[];
};

const publicProofLedgerEventNames = [
  PRODUCT_EVENT_NAMES.transactionLogged,
  PRODUCT_EVENT_NAMES.listingCreated,
  PRODUCT_EVENT_NAMES.proposalSubmitted,
  PRODUCT_EVENT_NAMES.interactionReceived,
  PRODUCT_EVENT_NAMES.profileLinkShared,
  PRODUCT_EVENT_NAMES.messageSent,
  PRODUCT_EVENT_NAMES.verificationCompleted
] as const;

function toMetadataRecord(
  value: Prisma.JsonValue | null | undefined
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readMetadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function formatEventSourceLabel(source: string | null): string {
  if (!source) {
    return "WHOMA event log";
  }

  if (source.startsWith("/agent/onboarding")) {
    return "Agent onboarding";
  }

  if (source.startsWith("/agent/profile")) {
    return "Agent profile workspace";
  }

  if (source.startsWith("/agent/marketplace")) {
    return "Agent collaboration workflow";
  }

  if (source.startsWith("/homeowner")) {
    return "Homeowner collaboration workflow";
  }

  if (source.startsWith("/api/agent/profile/share")) {
    return "Public profile sharing";
  }

  return "WHOMA event log";
}

export function mapProductEventToPublicProofLedgerEntry(input: {
  id: string;
  eventName: string;
  source: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}): PublicProofLedgerEntry | null {
  const metadata = toMetadataRecord(input.metadata);
  const sourceLabel = formatEventSourceLabel(input.source);

  const withDefaults = (
    title: string,
    detail: string,
    statusLabel: PublicProofLedgerStatusLabel = "Logged signal"
  ): PublicProofLedgerEntry => ({
    id: input.id,
    title,
    detail,
    sourceLabel,
    statusLabel,
    occurredAt: input.createdAt
  });

  if (input.eventName === PRODUCT_EVENT_NAMES.transactionLogged) {
    const postcodeDistrict = readMetadataString(metadata, "postcodeDistrict");
    const propertyType = readMetadataString(metadata, "propertyType");
    const completionMonth = readMetadataString(metadata, "completionMonth");
    const detailParts = [
      postcodeDistrict ? `Area: ${postcodeDistrict}` : null,
      propertyType ? `Property: ${propertyType}` : null,
      completionMonth ? `Completed: ${completionMonth}` : null
    ].filter(Boolean);

    return withDefaults(
      "Historic transaction logged",
      detailParts.join(" · ") || "Historic transaction evidence was logged."
    );
  }

  if (input.eventName === PRODUCT_EVENT_NAMES.listingCreated) {
    const listingType = readMetadataString(metadata, "listingType");
    const postcodeDistrict = readMetadataString(metadata, "postcodeDistrict");
    const collaborationType = readMetadataString(metadata, "collaborationType");
    const detailParts = [
      listingType ? `Type: ${listingType.replaceAll("_", " ")}` : null,
      postcodeDistrict ? `Area: ${postcodeDistrict}` : null,
      collaborationType ? `Mode: ${collaborationType}` : null
    ].filter(Boolean);

    return withDefaults(
      "Live collaboration activity logged",
      detailParts.join(" · ") || "Live activity was logged on WHOMA."
    );
  }

  if (input.eventName === PRODUCT_EVENT_NAMES.proposalSubmitted) {
    return withDefaults(
      "Structured response submitted",
      "A structured collaboration response was submitted."
    );
  }

  if (input.eventName === PRODUCT_EVENT_NAMES.interactionReceived) {
    return withDefaults(
      "Meaningful interaction received",
      "An inbound interaction signal was recorded."
    );
  }

  if (input.eventName === PRODUCT_EVENT_NAMES.profileLinkShared) {
    const channel = readMetadataString(metadata, "channel");
    return withDefaults(
      "Profile link shared",
      channel
        ? `Share channel: ${channel}`
        : "Profile link sharing activity recorded."
    );
  }

  if (input.eventName === PRODUCT_EVENT_NAMES.messageSent) {
    return withDefaults(
      "Conversation activity logged",
      "A structured conversation event was recorded."
    );
  }

  if (input.eventName === PRODUCT_EVENT_NAMES.verificationCompleted) {
    return withDefaults(
      "Verification milestone completed",
      "A WHOMA verification milestone was completed for this profile.",
      "Verified milestone"
    );
  }

  return null;
}

async function getPublicAgentProofLedger(
  userId: string,
  limit = 8
): Promise<PublicProofLedgerEntry[]> {
  if (!process.env.DATABASE_URL) {
    return [];
  }

  const rows = await prisma.productEvent.findMany({
    where: {
      subjectUserId: userId,
      eventName: {
        in: [...publicProofLedgerEventNames]
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });

  return rows
    .map((row) =>
      mapProductEventToPublicProofLedgerEntry({
        id: row.id,
        eventName: row.eventName,
        source: row.source,
        metadata: row.metadata as Prisma.JsonValue | null,
        createdAt: row.createdAt
      })
    )
    .filter((entry): entry is PublicProofLedgerEntry => entry !== null);
}

function shouldRestrictOfficialProductionData(): boolean {
  return process.env.NODE_ENV === "production";
}

function getOfficialAgentProfileFilter(): Prisma.AgentProfileWhereInput {
  if (!shouldRestrictOfficialProductionData()) {
    return {};
  }

  return {
    user: {
      is: {
        dataOrigin: "PRODUCTION"
      }
    }
  };
}

export async function completeAgentOnboarding(
  userId: string,
  input: AgentOnboardingInput
): Promise<AgentProfileWithUser> {
  const existingProfile = await prisma.agentProfile.findUnique({
    where: { userId },
    select: {
      profileSlug: true,
      workEmail: true,
      workEmailVerifiedAt: true,
      onboardingCompletedAt: true
    }
  });

  const normalizedWorkEmail = normalizeEmail(input.workEmail);
  const hasVerifiedWorkEmail =
    Boolean(existingProfile?.workEmailVerifiedAt) &&
    normalizeEmail(existingProfile?.workEmail ?? "") === normalizedWorkEmail;

  if (!hasVerifiedWorkEmail) {
    throw new WorkEmailVerificationError(
      "EMAIL_NOT_VERIFIED",
      "Verify your email before completing onboarding."
    );
  }

  const slug =
    existingProfile?.profileSlug ??
    (await buildUniqueSlug(`${input.fullName}-${input.agencyName}`, userId));
  const completeness = calculateAgentProfileCompleteness({
    agencyName: input.agencyName,
    jobTitle: input.jobTitle,
    workEmail: normalizedWorkEmail,
    phone: input.phone,
    yearsExperience: input.yearsExperience,
    bio: input.bio,
    serviceAreas: input.serviceAreas,
    specialties: input.specialties,
    achievements: input.achievements ?? [],
    languages: input.languages ?? [],
    feePreference: input.feePreference ?? null,
    transactionBand: input.transactionBand ?? null,
    collaborationPreference: input.collaborationPreference ?? null,
    responseTimeMinutes: input.responseTimeMinutes ?? null
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
      achievements: input.achievements ?? [],
      languages: input.languages ?? [],
      feePreference: input.feePreference ?? null,
      transactionBand: input.transactionBand ?? null,
      collaborationPreference: input.collaborationPreference ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? null,
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
      achievements: input.achievements ?? [],
      languages: input.languages ?? [],
      feePreference: input.feePreference ?? null,
      transactionBand: input.transactionBand ?? null,
      collaborationPreference: input.collaborationPreference ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? null,
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

  if (!existingProfile?.onboardingCompletedAt) {
    await trackEvent(
      PRODUCT_EVENT_NAMES.profileStarted,
      {
        userId,
        profileCompleteness: profile.profileCompleteness
      },
      {
        actorId: userId,
        actorRole: "AGENT",
        subjectUserId: userId,
        source: "/agent/onboarding"
      }
    );
  }

  if (profile.profileCompleteness >= MIN_AGENT_PUBLISH_COMPLETENESS) {
    await trackEvent(
      PRODUCT_EVENT_NAMES.profileCompleted,
      {
        userId,
        profileCompleteness: profile.profileCompleteness
      },
      {
        actorId: userId,
        actorRole: "AGENT",
        subjectUserId: userId,
        source: "/agent/onboarding"
      }
    );
  }

  return mapAgentProfile(profile);
}

export async function saveAgentProfileDraft(
  userId: string,
  input: AgentProfileDraftInput
): Promise<AgentProfileWithUser> {
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
      feePreference: true,
      transactionBand: true,
      collaborationPreference: true,
      responseTimeMinutes: true,
      onboardingCompletedAt: true,
      user: { select: { name: true } }
    }
  });

  const slug =
    existing?.profileSlug ??
    (await buildUniqueSlug(
      `${existing?.user.name ?? "agent"}-${input.agencyName}`,
      userId
    ));
  const normalizedWorkEmail = normalizeEmail(input.workEmail);
  const workEmailChanged =
    Boolean(existing?.workEmail) &&
    normalizeEmail(existing?.workEmail ?? "") !== normalizedWorkEmail;
  const requiresReverification =
    existing?.verificationStatus === "VERIFIED" &&
    hasMaterialProfileChanges(existing, input, normalizedWorkEmail);
  const normalizedYearsExperience = toNullableNumber(input.yearsExperience);
  const normalizedBio = toNullableString(input.bio);
  const completeness = calculateAgentProfileCompleteness({
    agencyName: input.agencyName,
    jobTitle: input.jobTitle,
    workEmail: normalizedWorkEmail,
    phone: input.phone,
    yearsExperience: normalizedYearsExperience,
    bio: normalizedBio,
    serviceAreas: input.serviceAreas,
    specialties: input.specialties,
    achievements: input.achievements,
    languages: input.languages,
    feePreference: input.feePreference ?? null,
    transactionBand: input.transactionBand ?? null,
    collaborationPreference: input.collaborationPreference ?? null,
    responseTimeMinutes: input.responseTimeMinutes ?? null
  });

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
      yearsExperience: normalizedYearsExperience,
      bio: normalizedBio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      feePreference: input.feePreference ?? null,
      transactionBand: input.transactionBand ?? null,
      collaborationPreference: input.collaborationPreference ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? null,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.DRAFT,
      profileCompleteness: completeness
    },
    update: {
      agencyName: input.agencyName,
      jobTitle: input.jobTitle,
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: workEmailChanged
        ? null
        : (existing?.workEmailVerifiedAt ?? null),
      ...(workEmailChanged
        ? {
            workEmailVerificationCodeHash: null,
            workEmailVerificationCodeExpiresAt: null
          }
        : {}),
      phone: input.phone,
      yearsExperience: normalizedYearsExperience,
      bio: normalizedBio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      feePreference: input.feePreference ?? null,
      transactionBand: input.transactionBand ?? null,
      collaborationPreference: input.collaborationPreference ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? null,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.DRAFT,
      profileCompleteness: completeness,
      ...(requiresReverification
        ? { verificationStatus: "PENDING" as const }
        : {})
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  if (!existing) {
    await trackEvent(
      PRODUCT_EVENT_NAMES.profileStarted,
      {
        userId,
        profileCompleteness: profile.profileCompleteness
      },
      {
        actorId: userId,
        actorRole: "AGENT",
        subjectUserId: userId,
        source: "/agent/profile/edit"
      }
    );
  }

  if (
    profile.onboardingCompletedAt &&
    profile.profileCompleteness >= MIN_AGENT_PUBLISH_COMPLETENESS
  ) {
    await trackEvent(
      PRODUCT_EVENT_NAMES.profileCompleted,
      {
        userId,
        profileCompleteness: profile.profileCompleteness
      },
      {
        actorId: userId,
        actorRole: "AGENT",
        subjectUserId: userId,
        source: "/agent/profile/edit"
      }
    );
  }

  return mapAgentProfile(profile);
}

export async function publishAgentProfile(
  userId: string,
  input: AgentProfilePublishInput
): Promise<AgentProfileWithUser> {
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
      feePreference: true,
      transactionBand: true,
      collaborationPreference: true,
      responseTimeMinutes: true,
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
      "Verify your email before publishing your profile."
    );
  }

  const slug =
    existing?.profileSlug ??
    (await buildUniqueSlug(
      `${existing?.user.name ?? "agent"}-${input.agencyName}`,
      userId
    ));
  const normalizedYearsExperience = toNullableNumber(input.yearsExperience);
  const normalizedBio = toNullableString(input.bio);
  const completeness = calculateAgentProfileCompleteness({
    agencyName: input.agencyName,
    jobTitle: input.jobTitle,
    workEmail: normalizedWorkEmail,
    phone: input.phone,
    yearsExperience: normalizedYearsExperience,
    bio: normalizedBio,
    serviceAreas: input.serviceAreas,
    specialties: input.specialties,
    achievements: input.achievements,
    languages: input.languages,
    feePreference: input.feePreference ?? null,
    transactionBand: input.transactionBand ?? null,
    collaborationPreference: input.collaborationPreference ?? null,
    responseTimeMinutes: input.responseTimeMinutes ?? null
  });

  if (completeness < MIN_AGENT_PUBLISH_COMPLETENESS) {
    throw new Error(
      `Profile completeness must be at least ${MIN_AGENT_PUBLISH_COMPLETENESS}% before publishing.`
    );
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
      yearsExperience: normalizedYearsExperience,
      bio: normalizedBio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      feePreference: input.feePreference ?? null,
      transactionBand: input.transactionBand ?? null,
      collaborationPreference: input.collaborationPreference ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? null,
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
      yearsExperience: normalizedYearsExperience,
      bio: normalizedBio,
      serviceAreas: input.serviceAreas,
      specialties: input.specialties,
      achievements: input.achievements,
      languages: input.languages,
      feePreference: input.feePreference ?? null,
      transactionBand: input.transactionBand ?? null,
      collaborationPreference: input.collaborationPreference ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? null,
      profileSlug: slug,
      profileStatus: AgentProfileStatus.PUBLISHED,
      profileCompleteness: completeness,
      ...(requiresReverification
        ? { verificationStatus: "PENDING" as const }
        : {}),
      publishedAt: new Date()
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  await trackEvent(
    PRODUCT_EVENT_NAMES.profileCompleted,
    {
      userId,
      profileCompleteness: profile.profileCompleteness,
      published: true
    },
    {
      actorId: userId,
      actorRole: "AGENT",
      subjectUserId: userId,
      source: "/agent/profile/edit"
    }
  );

  return mapAgentProfile(profile);
}

export async function getAgentProfileByUserId(
  userId: string
): Promise<AgentProfileWithUser | null> {
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

export async function getPublicAgentProfileBySlug(
  slug: string
): Promise<PublicAgentProfile | null> {
  const profile = await prisma.agentProfile.findFirst({
    where: {
      ...getOfficialAgentProfileFilter(),
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

  if (!profile) {
    return null;
  }

  const mappedProfile = mapAgentProfile(profile);
  const proofLedger = await getPublicAgentProofLedger(profile.userId);

  return {
    ...mappedProfile,
    proofLedger
  };
}

export async function listPublicAgentProfiles(filters: {
  serviceArea?: string | null;
  specialty?: string | null;
  limit?: number;
}): Promise<AgentProfileWithUser[]> {
  const normalizedSpecialty = filters.specialty?.trim().toLowerCase();
  const profiles = await prisma.agentProfile.findMany({
    where: {
      ...getOfficialAgentProfileFilter(),
      profileStatus: AgentProfileStatus.PUBLISHED,
      verificationStatus: "VERIFIED",
      ...(filters.serviceArea
        ? { serviceAreas: { has: filters.serviceArea.toUpperCase() } }
        : {})
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: [
      { verificationStatus: "desc" },
      { publishedAt: "desc" },
      { createdAt: "desc" }
    ]
  });

  const filteredProfiles = normalizedSpecialty
    ? profiles.filter((profile) =>
        profile.specialties.some((specialty) =>
          specialty.toLowerCase().includes(normalizedSpecialty)
        )
      )
    : profiles;

  return filteredProfiles.slice(0, filters.limit ?? 100).map(mapAgentProfile);
}

export async function requestAgentWorkEmailVerificationCode(
  userId: string,
  workEmail: string
): Promise<{
  expiresAt: Date;
  devCode?: string;
}> {
  const normalizedWorkEmail = normalizeEmail(workEmail);
  const now = new Date();
  const cooldownCutoff = new Date(
    now.getTime() - WORK_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000
  );

  const existing = await prisma.agentProfile.findUnique({
    where: { userId },
    select: {
      workEmail: true,
      workEmailVerifiedAt: true,
      workEmailVerificationCodeSentAt: true,
      workEmailVerificationLockedUntil: true
    }
  });

  if (
    existing?.workEmailVerificationLockedUntil &&
    existing.workEmailVerificationLockedUntil > now
  ) {
    throw new WorkEmailVerificationError(
      "ATTEMPTS_EXCEEDED",
      "Too many incorrect verification attempts. Request a new code after the lock period.",
      {
        lockedUntil: existing.workEmailVerificationLockedUntil.toISOString()
      }
    );
  }

  if (
    existing?.workEmailVerificationCodeSentAt &&
    existing.workEmailVerificationCodeSentAt > cooldownCutoff
  ) {
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil(
        (existing.workEmailVerificationCodeSentAt.getTime() +
          WORK_EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000 -
          now.getTime()) /
          1000
      )
    );

    throw new WorkEmailVerificationError(
      "RESEND_COOLDOWN",
      "Please wait before requesting another verification code.",
      { retryAfterSeconds }
    );
  }

  const verificationCode = createVerificationCode();
  const verificationCodeHash = hashWorkEmailVerificationCode(
    normalizedWorkEmail,
    verificationCode
  );
  const expiresAt = new Date(
    Date.now() + WORK_EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000
  );
  const workEmailChanged =
    Boolean(existing?.workEmail) &&
    normalizeEmail(existing?.workEmail ?? "") !== normalizedWorkEmail;

  await prisma.agentProfile.upsert({
    where: { userId },
    create: {
      userId,
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: null,
      workEmailVerificationCodeHash: verificationCodeHash,
      workEmailVerificationCodeExpiresAt: expiresAt,
      workEmailVerificationCodeSentAt: now,
      workEmailVerificationAttemptCount: 0,
      workEmailVerificationLockedUntil: null
    },
    update: {
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: workEmailChanged
        ? null
        : (existing?.workEmailVerifiedAt ?? null),
      workEmailVerificationCodeHash: verificationCodeHash,
      workEmailVerificationCodeExpiresAt: expiresAt,
      workEmailVerificationCodeSentAt: now,
      workEmailVerificationAttemptCount: 0,
      workEmailVerificationLockedUntil: null
    }
  });

  if (process.env.NODE_ENV === "production") {
    try {
      await sendWorkEmailVerificationCodeEmail({
        workEmail: normalizedWorkEmail,
        verificationCode,
        expiresAt
      });
    } catch (error) {
      if (error instanceof WorkEmailDeliveryError) {
        await prisma.agentProfile.update({
          where: { userId },
          data: {
            workEmailVerificationCodeHash: null,
            workEmailVerificationCodeExpiresAt: null,
            workEmailVerificationCodeSentAt: null
          }
        });

        throw new WorkEmailVerificationError(
          "EMAIL_DELIVERY_UNAVAILABLE",
          "We could not send the verification email right now.",
          error.details
        );
      }

      throw error;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[WHOMA] Work email verification code for ${normalizedWorkEmail}: ${verificationCode}`
    );
  }

  await trackEvent(
    PRODUCT_EVENT_NAMES.verificationSent,
    {
      userId,
      destinationDomain: normalizedWorkEmail.split("@")[1] ?? null
    },
    {
      actorId: userId,
      actorRole: "AGENT",
      subjectUserId: userId,
      source: "/agent/onboarding"
    }
  );

  return {
    expiresAt,
    ...(process.env.NODE_ENV !== "production"
      ? { devCode: verificationCode }
      : {})
  };
}

export async function confirmAgentWorkEmailVerificationCode(
  userId: string,
  workEmail: string,
  verificationCode: string
): Promise<void> {
  const normalizedWorkEmail = normalizeEmail(workEmail);
  const now = new Date();
  const profile = await prisma.agentProfile.findUnique({
    where: { userId },
    select: {
      workEmail: true,
      workEmailVerificationCodeHash: true,
      workEmailVerificationCodeExpiresAt: true,
      workEmailVerificationAttemptCount: true,
      workEmailVerificationLockedUntil: true
    }
  });

  if (
    profile?.workEmailVerificationLockedUntil &&
    profile.workEmailVerificationLockedUntil > now
  ) {
    throw new WorkEmailVerificationError(
      "ATTEMPTS_EXCEEDED",
      "Too many incorrect verification attempts. Please request a new code later.",
      {
        lockedUntil: profile.workEmailVerificationLockedUntil.toISOString()
      }
    );
  }

  if (
    !profile?.workEmailVerificationCodeHash ||
    !profile.workEmailVerificationCodeExpiresAt
  ) {
    throw new WorkEmailVerificationError(
      "CODE_NOT_REQUESTED",
      "Request a verification code before verifying your email."
    );
  }

  if (normalizeEmail(profile.workEmail ?? "") !== normalizedWorkEmail) {
    throw new WorkEmailVerificationError(
      "EMAIL_MISMATCH",
      "The verification code was requested for a different email address."
    );
  }

  if (profile.workEmailVerificationCodeExpiresAt < now) {
    throw new WorkEmailVerificationError(
      "CODE_EXPIRED",
      "That verification code has expired. Request a new code."
    );
  }

  const expectedHash = hashWorkEmailVerificationCode(
    normalizedWorkEmail,
    verificationCode
  );
  if (expectedHash !== profile.workEmailVerificationCodeHash) {
    const nextAttemptCount =
      (profile.workEmailVerificationAttemptCount ?? 0) + 1;
    const exceededAttempts =
      nextAttemptCount >= WORK_EMAIL_VERIFICATION_MAX_ATTEMPTS;
    const lockUntil = exceededAttempts
      ? new Date(
          now.getTime() + WORK_EMAIL_VERIFICATION_LOCK_MINUTES * 60 * 1000
        )
      : null;

    await prisma.agentProfile.update({
      where: { userId },
      data: {
        workEmailVerificationAttemptCount: nextAttemptCount,
        workEmailVerificationLockedUntil: lockUntil
      }
    });

    if (exceededAttempts) {
      throw new WorkEmailVerificationError(
        "ATTEMPTS_EXCEEDED",
        "Too many incorrect verification attempts. Please request a new code later.",
        {
          lockedUntil: lockUntil?.toISOString(),
          maxAttempts: WORK_EMAIL_VERIFICATION_MAX_ATTEMPTS
        }
      );
    }

    throw new WorkEmailVerificationError(
      "CODE_INVALID",
      "The verification code is invalid.",
      {
        remainingAttempts: Math.max(
          WORK_EMAIL_VERIFICATION_MAX_ATTEMPTS - nextAttemptCount,
          0
        )
      }
    );
  }

  await prisma.agentProfile.update({
    where: { userId },
    data: {
      workEmail: normalizedWorkEmail,
      workEmailVerifiedAt: now,
      workEmailVerificationCodeHash: null,
      workEmailVerificationCodeExpiresAt: null,
      workEmailVerificationCodeSentAt: null,
      workEmailVerificationAttemptCount: 0,
      workEmailVerificationLockedUntil: null
    }
  });

  await trackEvent(
    PRODUCT_EVENT_NAMES.verificationCompleted,
    {
      userId
    },
    {
      actorId: userId,
      actorRole: "AGENT",
      subjectUserId: userId,
      source: "/agent/onboarding"
    }
  );
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

function normalizeOptionalMetadataValue(
  value: string | undefined
): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function logAgentHistoricTransaction(
  userId: string,
  input: {
    postcodeDistrict?: string;
    propertyType?: string;
    completionMonth?: string;
  }
): Promise<void> {
  await trackEvent(
    PRODUCT_EVENT_NAMES.transactionLogged,
    {
      userId,
      transactionKind: "historic",
      postcodeDistrict: normalizeOptionalMetadataValue(input.postcodeDistrict),
      propertyType: normalizeOptionalMetadataValue(input.propertyType),
      completionMonth: normalizeOptionalMetadataValue(input.completionMonth)
    },
    {
      actorId: userId,
      actorRole: "AGENT",
      subjectUserId: userId,
      source: "/agent/profile/edit"
    }
  );
}

export async function logAgentLiveCollaboration(
  userId: string,
  input: {
    postcodeDistrict?: string;
    collaborationType?: string;
  }
): Promise<void> {
  await trackEvent(
    PRODUCT_EVENT_NAMES.listingCreated,
    {
      userId,
      listingType: "agent_live_collaboration",
      postcodeDistrict: normalizeOptionalMetadataValue(input.postcodeDistrict),
      collaborationType: normalizeOptionalMetadataValue(input.collaborationType)
    },
    {
      actorId: userId,
      actorRole: "AGENT",
      subjectUserId: userId,
      source: "/agent/profile/edit"
    }
  );
}

export async function logAgentProfileLinkShared(
  userId: string,
  input: {
    profileSlug?: string;
    channel?: string;
  } = {}
): Promise<void> {
  await trackEvent(
    PRODUCT_EVENT_NAMES.profileLinkShared,
    {
      userId,
      profileSlug: normalizeOptionalMetadataValue(input.profileSlug),
      channel: normalizeOptionalMetadataValue(input.channel) ?? "direct"
    },
    {
      actorId: userId,
      actorRole: "AGENT",
      subjectUserId: userId,
      source: "/api/agent/profile/share"
    }
  );
}

export async function setAgentVerificationStatus(
  userId: string,
  status: VerificationStatus
): Promise<void> {
  if (status === "VERIFIED") {
    const profile = await prisma.agentProfile.findUnique({
      where: { userId },
      select: { profileStatus: true, profileCompleteness: true }
    });

    if (
      !profile ||
      profile.profileStatus !== AgentProfileStatus.PUBLISHED ||
      profile.profileCompleteness < MIN_AGENT_PUBLISH_COMPLETENESS
    ) {
      throw new Error(
        "Only published profiles meeting completeness requirements can be verified."
      );
    }
  }

  await prisma.agentProfile.update({
    where: { userId },
    data: { verificationStatus: status }
  });
}

export async function listAgentProfilesForVerification(
  limit = 200
): Promise<AgentProfileWithUser[]> {
  const profiles = await prisma.agentProfile.findMany({
    where: getOfficialAgentProfileFilter(),
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: [
      { verificationStatus: "asc" },
      { onboardingCompletedAt: "desc" },
      { createdAt: "desc" }
    ],
    take: limit
  });

  return profiles.map(mapAgentProfile);
}

export interface AgentActivationMetrics {
  started: number;
  workEmailVerified: number;
  completed: number;
  publishReady: number;
  published: number;
  pendingVerification: number;
  verified: number;
  denied: number;
}

export async function getAgentActivationMetrics(): Promise<AgentActivationMetrics> {
  const officialAgentProfileFilter = getOfficialAgentProfileFilter();
  const [
    started,
    workEmailVerified,
    completed,
    publishReady,
    published,
    pendingVerification,
    verified,
    denied
  ] = await Promise.all([
    prisma.agentProfile.count({
      where: officialAgentProfileFilter
    }),
    prisma.agentProfile.count({
      where: {
        ...officialAgentProfileFilter,
        workEmailVerifiedAt: { not: null }
      }
    }),
    prisma.agentProfile.count({
      where: {
        ...officialAgentProfileFilter,
        onboardingCompletedAt: { not: null }
      }
    }),
    prisma.agentProfile.count({
      where: {
        ...officialAgentProfileFilter,
        onboardingCompletedAt: { not: null },
        profileCompleteness: { gte: MIN_AGENT_PUBLISH_COMPLETENESS }
      }
    }),
    prisma.agentProfile.count({
      where: {
        ...officialAgentProfileFilter,
        profileStatus: AgentProfileStatus.PUBLISHED
      }
    }),
    prisma.agentProfile.count({
      where: {
        ...officialAgentProfileFilter,
        verificationStatus: "PENDING"
      }
    }),
    prisma.agentProfile.count({
      where: {
        ...officialAgentProfileFilter,
        verificationStatus: "VERIFIED"
      }
    }),
    prisma.agentProfile.count({
      where: {
        ...officialAgentProfileFilter,
        verificationStatus: "REJECTED"
      }
    })
  ]);

  return {
    started,
    workEmailVerified,
    completed,
    publishReady,
    published,
    pendingVerification,
    verified,
    denied
  };
}

export async function getAgentOnboardingFunnelCounts(): Promise<AgentActivationMetrics> {
  return getAgentActivationMetrics();
}
