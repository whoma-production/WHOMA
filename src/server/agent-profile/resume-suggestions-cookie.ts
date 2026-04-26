import crypto from "node:crypto";

import { z } from "zod";

export const resumeSuggestionFieldKeys = [
  "fullName",
  "workEmail",
  "phone",
  "agencyName",
  "jobTitle",
  "yearsExperience",
  "bio",
  "serviceAreas",
  "specialties"
] as const;

export type ResumeSuggestionFieldKey =
  (typeof resumeSuggestionFieldKeys)[number];

export function isResumeSuggestionFieldKey(
  value: string
): value is ResumeSuggestionFieldKey {
  return (resumeSuggestionFieldKeys as readonly string[]).includes(value);
}

const resumePrefillValuesSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    workEmail: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().min(7).max(32).optional(),
    agencyName: z.string().trim().min(1).max(120).optional(),
    jobTitle: z.string().trim().min(1).max(120).optional(),
    yearsExperience: z.number().int().min(0).max(60).optional(),
    bio: z.string().trim().min(20).max(3000).optional(),
    serviceAreas: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    specialties: z.array(z.string().trim().min(1).max(80)).max(12).optional()
  })
  .strict();

const resumeLegacyConfidenceSchema = z
  .object({
    fullName: z.number().min(0).max(1).optional(),
    workEmail: z.number().min(0).max(1).optional(),
    phone: z.number().min(0).max(1).optional(),
    agencyName: z.number().min(0).max(1).optional(),
    jobTitle: z.number().min(0).max(1).optional(),
    yearsExperience: z.number().min(0).max(1).optional(),
    bio: z.number().min(0).max(1).optional(),
    serviceAreas: z.number().min(0).max(1).optional(),
    specialties: z.number().min(0).max(1).optional()
  })
  .strict();

const resumeLegacyEvidenceSchema = z
  .object({
    fullName: z.string().trim().min(1).max(280).optional(),
    workEmail: z.string().trim().min(1).max(280).optional(),
    phone: z.string().trim().min(1).max(280).optional(),
    agencyName: z.string().trim().min(1).max(280).optional(),
    jobTitle: z.string().trim().min(1).max(280).optional(),
    yearsExperience: z.string().trim().min(1).max(280).optional(),
    bio: z.string().trim().min(1).max(280).optional(),
    serviceAreas: z.string().trim().min(1).max(280).optional(),
    specialties: z.string().trim().min(1).max(280).optional()
  })
  .strict();

export const resumeSourceDocumentTypeSchema = z.enum([
  "cv",
  "resume",
  "bio",
  "linkedin_pdf",
  "other"
]);

export const resumeSourceDocumentSchema = z
  .object({
    document_id: z.string().trim().min(1).max(160),
    type: resumeSourceDocumentTypeSchema
  })
  .strict();

export const resumeNeedsConfirmationSchema = z
  .object({
    field: z.string().trim().min(1).max(80),
    reason: z.string().trim().min(1).max(240)
  })
  .strict();

export const resumeSocialLinksSchema = z
  .object({
    linkedin: z.string().trim().min(1).max(300).nullable(),
    website: z.string().trim().min(1).max(300).nullable(),
    instagram: z.string().trim().min(1).max(300).nullable()
  })
  .strict();

export const resumeProfileConfidenceSchema = z
  .object({
    full_name: z.number().min(0).max(1),
    preferred_display_name: z.number().min(0).max(1),
    email: z.number().min(0).max(1),
    phone: z.number().min(0).max(1),
    agency: z.number().min(0).max(1),
    job_title: z.number().min(0).max(1),
    years_experience: z.number().min(0).max(1),
    service_areas: z.number().min(0).max(1),
    specialties: z.number().min(0).max(1),
    credentials: z.number().min(0).max(1),
    languages: z.number().min(0).max(1),
    professional_summary: z.number().min(0).max(1),
    longer_bio: z.number().min(0).max(1),
    notable_experience: z.number().min(0).max(1),
    education: z.number().min(0).max(1),
    awards_or_memberships: z.number().min(0).max(1),
    social_links: z.number().min(0).max(1),
    headshot_present: z.number().min(0).max(1)
  })
  .strict();

export const resumeExtractionProfileSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).nullable(),
    preferred_display_name: z.string().trim().min(1).max(120).nullable(),
    email: z.string().trim().email().max(320).nullable(),
    phone: z.string().trim().min(7).max(32).nullable(),
    agency: z.string().trim().min(1).max(120).nullable(),
    job_title: z.string().trim().min(1).max(120).nullable(),
    years_experience: z.number().int().min(0).max(60).nullable(),
    service_areas: z.array(z.string().trim().min(1).max(40)).max(12),
    specialties: z.array(z.string().trim().min(1).max(80)).max(12),
    credentials: z.array(z.string().trim().min(1).max(80)).max(12),
    languages: z.array(z.string().trim().min(1).max(40)).max(12),
    professional_summary: z.string().trim().min(20).max(400).nullable(),
    longer_bio: z.string().trim().min(20).max(3000).nullable(),
    notable_experience: z.array(z.string().trim().min(1).max(140)).max(12),
    education: z.array(z.string().trim().min(1).max(140)).max(12),
    awards_or_memberships: z.array(z.string().trim().min(1).max(140)).max(12),
    social_links: resumeSocialLinksSchema,
    headshot_present: z.boolean(),
    source_documents: z.array(resumeSourceDocumentSchema).min(1).max(4),
    confidence: resumeProfileConfidenceSchema,
    missing_fields: z.array(z.string().trim().min(1).max(80)).max(24),
    needs_confirmation: z.array(resumeNeedsConfirmationSchema).max(24),
    publish_readiness_score: z.number().int().min(0).max(100),
    recommended_next_steps: z.array(z.string().trim().min(1).max(140)).max(12)
  })
  .strict();

const resumeSuggestionsV1Schema = z
  .object({
    version: z.literal(1),
    sourceFileName: z.string().trim().min(1).max(180),
    sourceMimeType: z.string().trim().min(1).max(120),
    extractedAtIso: z.string().datetime(),
    extractedTextLength: z.number().int().min(0).max(50_000),
    summary: z.string().trim().min(1).max(400),
    highlights: z.array(z.string().trim().min(1).max(140)).max(8),
    prefill: resumePrefillValuesSchema
  })
  .strict();

const resumeSuggestionsV2Schema = z
  .object({
    version: z.literal(2),
    suggestionId: z.string().trim().min(8).max(120),
    sourceFileName: z.string().trim().min(1).max(180),
    sourceMimeType: z.string().trim().min(1).max(120),
    extractedAtIso: z.string().datetime(),
    extractedTextLength: z.number().int().min(0).max(50_000),
    summary: z.string().trim().min(1).max(400),
    highlights: z.array(z.string().trim().min(1).max(140)).max(8),
    prefill: resumePrefillValuesSchema,
    confidence: resumeLegacyConfidenceSchema,
    evidence: resumeLegacyEvidenceSchema,
    warnings: z.array(z.string().trim().min(1).max(200)).max(12)
  })
  .strict();

const resumeSuggestionsV3Schema = z
  .object({
    version: z.literal(3),
    suggestionId: z.string().trim().min(8).max(120),
    sourceFileName: z.string().trim().min(1).max(180),
    sourceMimeType: z.string().trim().min(1).max(120),
    extractedAtIso: z.string().datetime(),
    extractedTextLength: z.number().int().min(0).max(50_000),
    summary: z.string().trim().min(1).max(400),
    highlights: z.array(z.string().trim().min(1).max(140)).max(8),
    profile: resumeExtractionProfileSchema,
    prefill: resumePrefillValuesSchema,
    confidence: resumeLegacyConfidenceSchema,
    evidence: resumeLegacyEvidenceSchema,
    warnings: z.array(z.string().trim().min(1).max(200)).max(12)
  })
  .strict();

const resumeSuggestionsSchema = z.union([
  resumeSuggestionsV1Schema,
  resumeSuggestionsV2Schema,
  resumeSuggestionsV3Schema
]);

export type ResumeExtractionProfile = z.infer<
  typeof resumeExtractionProfileSchema
>;
export type ResumeExtractionProfileConfidence = z.infer<
  typeof resumeProfileConfidenceSchema
>;
export type ResumeSourceDocument = z.infer<typeof resumeSourceDocumentSchema>;
export type ResumeNeedsConfirmation = z.infer<
  typeof resumeNeedsConfirmationSchema
>;
export type ResumePrefillValues = z.infer<typeof resumePrefillValuesSchema>;
export type ResumeSuggestionConfidence = z.infer<
  typeof resumeLegacyConfidenceSchema
>;
export type ResumeSuggestionEvidence = z.infer<
  typeof resumeLegacyEvidenceSchema
>;
export type ResumeSuggestions = z.infer<typeof resumeSuggestionsV3Schema>;

export const RESUME_SUGGESTIONS_COOKIE_NAME = "whoma_agent_resume_suggestions";
export const RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS = 15 * 60;
export const RESUME_SUGGESTIONS_COOKIE_MAX_VALUE_BYTES = 3400;

function getResumeSuggestionSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "whoma-agent-resume-suggestions"
  );
}

function signPayload(serializedPayload: string): string {
  return crypto
    .createHmac("sha256", getResumeSuggestionSecret())
    .update(serializedPayload)
    .digest("base64url");
}

function createLegacySuggestionId(input: {
  sourceFileName: string;
  extractedAtIso: string;
  extractedTextLength: number;
}): string {
  const stableSeed = `${input.sourceFileName}:${input.extractedAtIso}:${input.extractedTextLength}`;
  const hash = crypto.createHash("sha256").update(stableSeed).digest("hex");
  return `legacy_${hash.slice(0, 24)}`;
}

function createSuggestionId(input: {
  sourceFileName: string;
  extractedAtIso: string;
  extractedTextLength: number;
}): string {
  const stableSeed = `${input.sourceFileName}:${input.extractedAtIso}:${input.extractedTextLength}`;
  const hash = crypto.createHash("sha256").update(stableSeed).digest("hex");
  return `resume_${hash.slice(0, 24)}`;
}

function normalizeStringList(
  values: string[] | undefined,
  limit: number
): string[] {
  if (!values) {
    return [];
  }

  return values
    .map((value) => value.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, limit);
}

function truncateText(value: string | null, maxLength: number): string | null {
  if (!value) {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim();
}

function truncateOptionalText(
  value: string | undefined,
  maxLength: number
): string | undefined {
  return truncateText(value ?? null, maxLength) ?? undefined;
}

function truncateArray(
  values: string[],
  maxItems: number,
  maxLength: number
): string[] {
  return values
    .map((value) => truncateText(value, maxLength))
    .filter((value): value is string => Boolean(value))
    .slice(0, maxItems);
}

function truncatePrefillValues(
  prefill: ResumePrefillValues,
  options: { bioMax: number; listMax: number }
): ResumePrefillValues {
  return {
    ...prefill,
    ...(prefill.fullName
      ? { fullName: truncateOptionalText(prefill.fullName, 120) }
      : {}),
    ...(prefill.workEmail
      ? { workEmail: truncateOptionalText(prefill.workEmail, 320) }
      : {}),
    ...(prefill.phone
      ? { phone: truncateOptionalText(prefill.phone, 32) }
      : {}),
    ...(prefill.agencyName
      ? { agencyName: truncateOptionalText(prefill.agencyName, 120) }
      : {}),
    ...(prefill.jobTitle
      ? { jobTitle: truncateOptionalText(prefill.jobTitle, 120) }
      : {}),
    ...(prefill.bio && options.bioMax > 0
      ? { bio: truncateOptionalText(prefill.bio, options.bioMax) }
      : {}),
    ...(prefill.serviceAreas
      ? {
          serviceAreas: truncateArray(prefill.serviceAreas, options.listMax, 40)
        }
      : {}),
    ...(prefill.specialties
      ? {
          specialties: truncateArray(prefill.specialties, options.listMax, 80)
        }
      : {})
  };
}

function compactProfile(
  profile: ResumeExtractionProfile,
  options: {
    summaryMax: number;
    bioMax: number;
    listMax: number;
    needsConfirmationMax: number;
    nextStepsMax: number;
  }
): ResumeExtractionProfile {
  return {
    ...profile,
    full_name: truncateText(profile.full_name, 120),
    preferred_display_name: truncateText(profile.preferred_display_name, 120),
    agency: truncateText(profile.agency, 120),
    job_title: truncateText(profile.job_title, 120),
    professional_summary: truncateText(
      profile.professional_summary,
      options.summaryMax
    ),
    longer_bio: truncateText(profile.longer_bio, options.bioMax),
    service_areas: truncateArray(profile.service_areas, options.listMax, 40),
    specialties: truncateArray(profile.specialties, options.listMax, 80),
    credentials: truncateArray(profile.credentials, options.listMax, 80),
    languages: truncateArray(profile.languages, options.listMax, 40),
    notable_experience: truncateArray(
      profile.notable_experience,
      options.listMax,
      100
    ),
    education: truncateArray(
      profile.education,
      Math.min(options.listMax, 4),
      100
    ),
    awards_or_memberships: truncateArray(
      profile.awards_or_memberships,
      Math.min(options.listMax, 4),
      100
    ),
    social_links: {
      linkedin: truncateText(profile.social_links.linkedin, 220),
      website: null,
      instagram: null
    },
    source_documents: profile.source_documents.slice(0, 1),
    missing_fields: truncateArray(profile.missing_fields, 12, 80),
    needs_confirmation: profile.needs_confirmation
      .map((item) => ({
        field: truncateText(item.field, 80) ?? item.field,
        reason: truncateText(item.reason, 160) ?? item.reason
      }))
      .slice(0, options.needsConfirmationMax),
    recommended_next_steps: truncateArray(
      profile.recommended_next_steps,
      options.nextStepsMax,
      100
    )
  };
}

function compactSuggestion(
  input: ResumeSuggestions,
  level: "moderate" | "aggressive" | "minimal"
): ResumeSuggestions {
  const parsed = resumeSuggestionsV3Schema.parse(input);

  if (level === "minimal") {
    const prefill = truncatePrefillValues(parsed.prefill, {
      bioMax: 0,
      listMax: 4
    });
    const sourceDocument = parsed.profile.source_documents[0] ?? {
      document_id: parsed.suggestionId,
      type: "resume" as const
    };
    const compactSummary = "Review imported CV draft.";
    const profile: ResumeExtractionProfile = {
      full_name: prefill.fullName ?? null,
      preferred_display_name: prefill.fullName ?? null,
      email: prefill.workEmail ?? null,
      phone: prefill.phone ?? null,
      agency: prefill.agencyName ?? null,
      job_title: prefill.jobTitle ?? null,
      years_experience: prefill.yearsExperience ?? null,
      service_areas: prefill.serviceAreas ?? [],
      specialties: prefill.specialties ?? [],
      credentials: [],
      languages: [],
      professional_summary: compactSummary,
      longer_bio: null,
      notable_experience: [],
      education: [],
      awards_or_memberships: [],
      social_links: {
        linkedin: null,
        website: null,
        instagram: null
      },
      headshot_present: false,
      source_documents: [sourceDocument],
      confidence: {
        full_name: prefill.fullName ? 0.8 : 0,
        preferred_display_name: prefill.fullName ? 0.8 : 0,
        email: prefill.workEmail ? 0.8 : 0,
        phone: prefill.phone ? 0.75 : 0,
        agency: prefill.agencyName ? 0.75 : 0,
        job_title: prefill.jobTitle ? 0.75 : 0,
        years_experience: prefill.yearsExperience !== undefined ? 0.75 : 0,
        service_areas: prefill.serviceAreas?.length ? 0.75 : 0,
        specialties: prefill.specialties?.length ? 0.75 : 0,
        credentials: 0,
        languages: 0,
        professional_summary: 0.7,
        longer_bio: 0,
        notable_experience: 0,
        education: 0,
        awards_or_memberships: 0,
        social_links: 0,
        headshot_present: 0
      },
      missing_fields: [],
      needs_confirmation: [],
      publish_readiness_score: parsed.profile.publish_readiness_score,
      recommended_next_steps: []
    };

    return {
      ...parsed,
      summary: compactSummary,
      highlights: [],
      profile,
      prefill: profileToPrefill(profile),
      confidence: confidenceToLegacyConfidence(profile),
      evidence: createHeuristicEvidence(profileToPrefill(profile)),
      warnings: []
    };
  }

  const aggressive = level === "aggressive";
  const prefill = truncatePrefillValues(parsed.prefill, {
    bioMax: aggressive ? 500 : 900,
    listMax: aggressive ? 5 : 8
  });

  return {
    ...parsed,
    summary:
      truncateText(parsed.summary, aggressive ? 220 : 320) ?? parsed.summary,
    highlights: truncateArray(parsed.highlights, aggressive ? 4 : 6, 100),
    prefill,
    profile: compactProfile(parsed.profile, {
      summaryMax: aggressive ? 220 : 320,
      bioMax: aggressive ? 500 : 900,
      listMax: aggressive ? 5 : 8,
      needsConfirmationMax: aggressive ? 6 : 10,
      nextStepsMax: aggressive ? 5 : 8
    }),
    evidence: Object.fromEntries(
      Object.entries(parsed.evidence)
        .map(([key, value]) => [
          key,
          truncateText(value ?? null, aggressive ? 120 : 180)
        ])
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    ) as ResumeSuggestionEvidence,
    warnings: truncateArray(parsed.warnings, aggressive ? 4 : 8, 140)
  };
}

function encodeParsedSuggestion(parsed: ResumeSuggestions): string {
  const serializedPayload = JSON.stringify(parsed);
  const payload = Buffer.from(serializedPayload, "utf8").toString("base64url");
  const signature = signPayload(serializedPayload);
  return `${signature}.${payload}`;
}

function profileToPrefill(
  profile: ResumeExtractionProfile
): ResumePrefillValues {
  const bio = profile.professional_summary ?? profile.longer_bio ?? undefined;

  return {
    ...(profile.full_name ? { fullName: profile.full_name } : {}),
    ...(profile.email ? { workEmail: profile.email } : {}),
    ...(profile.phone ? { phone: profile.phone } : {}),
    ...(profile.agency ? { agencyName: profile.agency } : {}),
    ...(profile.job_title ? { jobTitle: profile.job_title } : {}),
    ...(profile.years_experience !== null
      ? { yearsExperience: profile.years_experience }
      : {}),
    ...(bio ? { bio: bio.slice(0, 3000) } : {}),
    ...(profile.service_areas.length > 0
      ? { serviceAreas: profile.service_areas }
      : {}),
    ...(profile.specialties.length > 0
      ? { specialties: profile.specialties }
      : {})
  };
}

function confidenceToLegacyConfidence(
  profile: ResumeExtractionProfile
): ResumeSuggestionConfidence {
  return {
    ...(profile.confidence.full_name > 0
      ? { fullName: profile.confidence.full_name }
      : {}),
    ...(profile.confidence.email > 0
      ? { workEmail: profile.confidence.email }
      : {}),
    ...(profile.confidence.phone > 0
      ? { phone: profile.confidence.phone }
      : {}),
    ...(profile.confidence.agency > 0
      ? { agencyName: profile.confidence.agency }
      : {}),
    ...(profile.confidence.job_title > 0
      ? { jobTitle: profile.confidence.job_title }
      : {}),
    ...(profile.confidence.years_experience > 0
      ? { yearsExperience: profile.confidence.years_experience }
      : {}),
    ...(profile.confidence.professional_summary > 0
      ? { bio: profile.confidence.professional_summary }
      : {}),
    ...(profile.confidence.service_areas > 0
      ? { serviceAreas: profile.confidence.service_areas }
      : {}),
    ...(profile.confidence.specialties > 0
      ? { specialties: profile.confidence.specialties }
      : {})
  };
}

function createHeuristicEvidence(
  prefill: ResumePrefillValues
): ResumeSuggestionEvidence {
  return {
    ...(prefill.fullName ? { fullName: prefill.fullName } : {}),
    ...(prefill.workEmail ? { workEmail: prefill.workEmail } : {}),
    ...(prefill.phone ? { phone: prefill.phone } : {}),
    ...(prefill.agencyName ? { agencyName: prefill.agencyName } : {}),
    ...(prefill.jobTitle ? { jobTitle: prefill.jobTitle } : {}),
    ...(prefill.yearsExperience !== undefined
      ? { yearsExperience: String(prefill.yearsExperience) }
      : {}),
    ...(prefill.bio ? { bio: prefill.bio.slice(0, 260) } : {}),
    ...(prefill.serviceAreas?.length
      ? { serviceAreas: prefill.serviceAreas.join(", ") }
      : {}),
    ...(prefill.specialties?.length
      ? { specialties: prefill.specialties.join(", ") }
      : {})
  };
}

function createProfileFromPrefill(
  prefill: ResumePrefillValues,
  sourceDocument: ResumeSourceDocument
): ResumeExtractionProfile {
  const summary = prefill.bio ?? null;
  const serviceAreas = normalizeStringList(prefill.serviceAreas, 12);
  const specialties = normalizeStringList(prefill.specialties, 12);

  return {
    full_name: prefill.fullName ?? null,
    preferred_display_name: prefill.fullName ?? null,
    email: prefill.workEmail ?? null,
    phone: prefill.phone ?? null,
    agency: prefill.agencyName ?? null,
    job_title: prefill.jobTitle ?? null,
    years_experience: prefill.yearsExperience ?? null,
    service_areas: serviceAreas,
    specialties,
    credentials: [],
    languages: [],
    professional_summary: summary,
    longer_bio: summary,
    notable_experience: [],
    education: [],
    awards_or_memberships: [],
    social_links: {
      linkedin: null,
      website: null,
      instagram: null
    },
    headshot_present: false,
    source_documents: [sourceDocument],
    confidence: {
      full_name: prefill.fullName ? 0.78 : 0,
      preferred_display_name: prefill.fullName ? 0.65 : 0,
      email: prefill.workEmail ? 0.92 : 0,
      phone: prefill.phone ? 0.86 : 0,
      agency: prefill.agencyName ? 0.72 : 0,
      job_title: prefill.jobTitle ? 0.74 : 0,
      years_experience: prefill.yearsExperience !== undefined ? 0.75 : 0,
      service_areas: serviceAreas.length > 0 ? 0.82 : 0,
      specialties: specialties.length > 0 ? 0.8 : 0,
      credentials: 0,
      languages: 0,
      professional_summary: summary ? 0.7 : 0,
      longer_bio: summary ? 0.7 : 0,
      notable_experience: 0,
      education: 0,
      awards_or_memberships: 0,
      social_links: 0,
      headshot_present: 0
    },
    missing_fields: [],
    needs_confirmation: [],
    publish_readiness_score: 0,
    recommended_next_steps: []
  };
}

function deriveProfileCompletion(
  profile: ResumeExtractionProfile
): ResumeExtractionProfile {
  const missingFields = new Set<string>();
  const needsConfirmation: ResumeNeedsConfirmation[] = [];

  const coreFieldChecks: Array<{
    field: keyof ResumeExtractionProfileConfidence;
    valuePresent: boolean;
    required: boolean;
    missingLabel: string;
    confirmationReason: string;
  }> = [
    {
      field: "full_name",
      valuePresent: Boolean(profile.full_name),
      required: true,
      missingLabel: "full_name",
      confirmationReason: "Confirm the agent's display name."
    },
    {
      field: "agency",
      valuePresent: Boolean(profile.agency),
      required: true,
      missingLabel: "agency",
      confirmationReason: "Confirm the agency or brand name."
    },
    {
      field: "job_title",
      valuePresent: Boolean(profile.job_title),
      required: true,
      missingLabel: "job_title",
      confirmationReason: "Confirm the current job title."
    },
    {
      field: "service_areas",
      valuePresent: profile.service_areas.length > 0,
      required: true,
      missingLabel: "service_areas",
      confirmationReason: "Confirm the main service areas."
    },
    {
      field: "specialties",
      valuePresent: profile.specialties.length > 0,
      required: true,
      missingLabel: "specialties",
      confirmationReason: "Confirm the specialties shown on the public profile."
    },
    {
      field: "professional_summary",
      valuePresent: Boolean(profile.professional_summary),
      required: true,
      missingLabel: "professional_summary",
      confirmationReason: "Add or confirm the public summary."
    },
    {
      field: "email",
      valuePresent: Boolean(profile.email),
      required: true,
      missingLabel: "email",
      confirmationReason: "Confirm the contact email address."
    },
    {
      field: "phone",
      valuePresent: Boolean(profile.phone),
      required: false,
      missingLabel: "phone",
      confirmationReason: "Confirm the contact number."
    },
    {
      field: "headshot_present",
      valuePresent: profile.headshot_present,
      required: false,
      missingLabel: "headshot_present",
      confirmationReason:
        "Add a headshot if you want a stronger public profile."
    }
  ];

  let weightedScore = 0;
  const fieldWeights: Record<string, number> = {
    full_name: 15,
    agency: 14,
    job_title: 10,
    service_areas: 12,
    specialties: 12,
    professional_summary: 15,
    email: 10,
    phone: 6,
    headshot_present: 6,
    credentials: 3,
    languages: 2,
    notable_experience: 2,
    education: 2,
    awards_or_memberships: 3
  };

  for (const item of coreFieldChecks) {
    const confidenceValue = profile.confidence[item.field];
    if (!item.valuePresent || confidenceValue < 0.7) {
      if (item.required) {
        missingFields.add(item.missingLabel);
      }
      continue;
    }

    if (confidenceValue < 0.9) {
      needsConfirmation.push({
        field: item.missingLabel,
        reason: item.confirmationReason
      });
      weightedScore += (fieldWeights[item.field] ?? 0) * 0.7;
      continue;
    }

    weightedScore += fieldWeights[item.field] ?? 0;
  }

  weightedScore +=
    profile.credentials.length > 0 ? (fieldWeights.credentials ?? 0) : 0;
  weightedScore +=
    profile.languages.length > 0 ? (fieldWeights.languages ?? 0) : 0;
  weightedScore +=
    profile.notable_experience.length > 0
      ? (fieldWeights.notable_experience ?? 0)
      : 0;
  weightedScore +=
    profile.education.length > 0 ? (fieldWeights.education ?? 0) : 0;
  weightedScore +=
    profile.awards_or_memberships.length > 0
      ? (fieldWeights.awards_or_memberships ?? 0)
      : 0;

  if (
    profile.social_links.linkedin ||
    profile.social_links.website ||
    profile.social_links.instagram
  ) {
    weightedScore += 2;
  }

  const publishReadinessScore = Math.max(
    0,
    Math.min(100, Math.round(weightedScore))
  );

  const recommendedNextSteps = new Set<string>();

  if (missingFields.has("full_name")) {
    recommendedNextSteps.add("Confirm the agent name");
  }
  if (missingFields.has("agency")) {
    recommendedNextSteps.add("Confirm the agency name");
  }
  if (missingFields.has("job_title")) {
    recommendedNextSteps.add("Add the current job title");
  }
  if (missingFields.has("service_areas")) {
    recommendedNextSteps.add("Add the main service areas");
  }
  if (missingFields.has("specialties")) {
    recommendedNextSteps.add("Add the core specialties");
  }
  if (missingFields.has("professional_summary")) {
    recommendedNextSteps.add("Write a short public summary");
  }
  if (missingFields.has("email")) {
    recommendedNextSteps.add("Add a contact email");
  }
  if (!profile.headshot_present) {
    recommendedNextSteps.add("Upload a headshot");
  }
  if (needsConfirmation.length > 0) {
    recommendedNextSteps.add("Review the fields needing confirmation");
  }
  if (publishReadinessScore >= 75) {
    recommendedNextSteps.add(
      "Publish the profile when you're happy with the draft"
    );
  } else {
    recommendedNextSteps.add("Finish the missing fields before publishing");
  }

  profile.missing_fields = Array.from(missingFields).slice(0, 24);
  profile.needs_confirmation = needsConfirmation.slice(0, 24);
  profile.publish_readiness_score = publishReadinessScore;
  profile.recommended_next_steps = Array.from(recommendedNextSteps).slice(
    0,
    12
  );

  return profile;
}

function normalizeSuggestion(input: unknown): ResumeSuggestions {
  const parsed = resumeSuggestionsSchema.parse(input);

  if (parsed.version === 3) {
    return parsed;
  }

  if (parsed.version === 2) {
    const sourceDocument: ResumeSourceDocument = {
      document_id: createLegacySuggestionId(parsed),
      type: "resume"
    };

    const profile = deriveProfileCompletion(
      createProfileFromPrefill(parsed.prefill, sourceDocument)
    );

    return {
      version: 3,
      suggestionId: parsed.suggestionId,
      sourceFileName: parsed.sourceFileName,
      sourceMimeType: parsed.sourceMimeType,
      extractedAtIso: parsed.extractedAtIso,
      extractedTextLength: parsed.extractedTextLength,
      summary: parsed.summary,
      highlights: parsed.highlights,
      profile,
      prefill: profileToPrefill(profile),
      confidence: parsed.confidence,
      evidence: parsed.evidence,
      warnings: parsed.warnings
    };
  }

  const sourceDocument: ResumeSourceDocument = {
    document_id: createLegacySuggestionId(parsed),
    type: "resume"
  };

  const profile = deriveProfileCompletion(
    createProfileFromPrefill(parsed.prefill, sourceDocument)
  );

  return {
    version: 3,
    suggestionId: createSuggestionId(parsed),
    sourceFileName: parsed.sourceFileName,
    sourceMimeType: parsed.sourceMimeType,
    extractedAtIso: parsed.extractedAtIso,
    extractedTextLength: parsed.extractedTextLength,
    summary: parsed.summary,
    highlights: parsed.highlights,
    profile,
    prefill: profileToPrefill(profile),
    confidence: confidenceToLegacyConfidence(profile),
    evidence: createHeuristicEvidence(profileToPrefill(profile)),
    warnings: []
  };
}

export function encodeResumeSuggestionsCookie(
  input: ResumeSuggestions
): string {
  const parsed = resumeSuggestionsV3Schema.parse(input);
  const candidates: ResumeSuggestions[] = [
    parsed,
    compactSuggestion(parsed, "moderate"),
    compactSuggestion(parsed, "aggressive"),
    compactSuggestion(parsed, "minimal")
  ];

  for (const candidate of candidates) {
    const encoded = encodeParsedSuggestion(candidate);

    if (
      Buffer.byteLength(encoded, "utf8") <=
      RESUME_SUGGESTIONS_COOKIE_MAX_VALUE_BYTES
    ) {
      return encoded;
    }
  }

  return encodeParsedSuggestion(compactSuggestion(parsed, "minimal"));
}

export function decodeResumeSuggestionsCookie(
  rawValue: string | undefined
): ResumeSuggestions | null {
  if (!rawValue) {
    return null;
  }

  const separatorIndex = rawValue.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex === rawValue.length - 1) {
    return null;
  }

  const signature = rawValue.slice(0, separatorIndex);
  const payload = rawValue.slice(separatorIndex + 1);

  let serializedPayload: string;
  try {
    serializedPayload = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSignature = signPayload(serializedPayload);
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(serializedPayload) as unknown;
    const suggestion = normalizeSuggestion(parsed);

    const extractedAt = Date.parse(suggestion.extractedAtIso);
    if (!Number.isFinite(extractedAt)) {
      return null;
    }

    const maxAgeMs = RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS * 1000;
    if (Date.now() - extractedAt > maxAgeMs) {
      return null;
    }

    return suggestion;
  } catch {
    return null;
  }
}
