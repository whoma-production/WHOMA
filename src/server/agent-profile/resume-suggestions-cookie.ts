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

export type ResumeSuggestionFieldKey = (typeof resumeSuggestionFieldKeys)[number];

export function isResumeSuggestionFieldKey(value: string): value is ResumeSuggestionFieldKey {
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
    serviceAreas: z.array(z.string().trim().min(1).max(10)).max(12).optional(),
    specialties: z.array(z.string().trim().min(1).max(80)).max(12).optional()
  })
  .strict();

const resumeConfidenceSchema = z
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

const resumeEvidenceSchema = z
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
    confidence: resumeConfidenceSchema,
    evidence: resumeEvidenceSchema,
    warnings: z.array(z.string().trim().min(1).max(200)).max(12)
  })
  .strict();

const resumeSuggestionsSchema = z.union([
  resumeSuggestionsV1Schema,
  resumeSuggestionsV2Schema
]);

type ResumeSuggestionsV1 = z.infer<typeof resumeSuggestionsV1Schema>;
export type ResumePrefillValues = z.infer<typeof resumePrefillValuesSchema>;
export type ResumeSuggestionConfidence = z.infer<typeof resumeConfidenceSchema>;
export type ResumeSuggestionEvidence = z.infer<typeof resumeEvidenceSchema>;
export type ResumeSuggestions = z.infer<typeof resumeSuggestionsV2Schema>;

export const RESUME_SUGGESTIONS_COOKIE_NAME = "whoma_agent_resume_suggestions";
export const RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS = 15 * 60;

function getResumeSuggestionSecret(): string {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "whoma-agent-resume-suggestions";
  return secret;
}

function signPayload(serializedPayload: string): string {
  return crypto
    .createHmac("sha256", getResumeSuggestionSecret())
    .update(serializedPayload)
    .digest("base64url");
}

function createLegacySuggestionId(input: ResumeSuggestionsV1): string {
  const stableSeed = `${input.sourceFileName}:${input.extractedAtIso}:${input.extractedTextLength}`;
  const hash = crypto.createHash("sha256").update(stableSeed).digest("hex");
  return `legacy_${hash.slice(0, 24)}`;
}

function upgradeLegacySuggestion(input: ResumeSuggestionsV1): ResumeSuggestions {
  return {
    version: 2,
    suggestionId: createLegacySuggestionId(input),
    sourceFileName: input.sourceFileName,
    sourceMimeType: input.sourceMimeType,
    extractedAtIso: input.extractedAtIso,
    extractedTextLength: input.extractedTextLength,
    summary: input.summary,
    highlights: input.highlights,
    prefill: input.prefill,
    confidence: {},
    evidence: {},
    warnings: []
  };
}

function normalizeSuggestion(input: unknown): ResumeSuggestions {
  const parsed = resumeSuggestionsSchema.parse(input);

  if (parsed.version === 2) {
    return parsed;
  }

  return upgradeLegacySuggestion(parsed);
}

export function encodeResumeSuggestionsCookie(input: ResumeSuggestions): string {
  const parsed = resumeSuggestionsV2Schema.parse(input);
  const serializedPayload = JSON.stringify(parsed);
  const payload = Buffer.from(serializedPayload, "utf8").toString("base64url");
  const signature = signPayload(serializedPayload);
  return `${signature}.${payload}`;
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
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
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
