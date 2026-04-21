import crypto from "node:crypto";

import { isAcceptedWorkEmail } from "@/lib/validation/agent-profile";
import {
  getResumeFeatureFlags,
  type ResumePipelineMode
} from "@/server/agent-profile/resume-flags";
import {
  deriveResumePrefillValues,
  extractResumeTextFromFile,
  ResumeExtractionError,
  validateResumeUploadFile
} from "@/server/agent-profile/resume-intake";
import type {
  ResumeExtractionProfile,
  ResumeNeedsConfirmation,
  ResumePrefillValues,
  ResumeSuggestionConfidence,
  ResumeSuggestionEvidence,
  ResumeSourceDocument,
  ResumeSuggestions
} from "@/server/agent-profile/resume-suggestions-cookie";
import {
  resumeExtractionProfileSchema,
  resumeNeedsConfirmationSchema,
  resumeProfileConfidenceSchema,
  resumeSourceDocumentSchema
} from "@/server/agent-profile/resume-suggestions-cookie";

const MIN_USABLE_TEXT_LENGTH = 120;
const MAX_EXTRACTED_TEXT_LENGTH = 25_000;
const MAX_LLM_INPUT_CHARACTERS = 14_000;

type ResumeFieldKey =
  | "fullName"
  | "workEmail"
  | "phone"
  | "agencyName"
  | "jobTitle"
  | "yearsExperience"
  | "bio"
  | "serviceAreas"
  | "specialties";

export type ResumePipelineMeta = {
  mode: ResumePipelineMode;
  ocrUsed: boolean;
  llmUsed: boolean;
  durationMs: number;
};

export type ResumeIntakeResult = {
  suggestion: ResumeSuggestions;
  pipeline: ResumePipelineMeta;
};

export type ResumeLlmPromptBundle = {
  systemPrompt: string;
  userPrompt: string;
};

const resumeProfileConfidenceJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "full_name",
    "preferred_display_name",
    "email",
    "phone",
    "agency",
    "job_title",
    "years_experience",
    "service_areas",
    "specialties",
    "credentials",
    "languages",
    "professional_summary",
    "longer_bio",
    "notable_experience",
    "education",
    "awards_or_memberships",
    "social_links",
    "headshot_present"
  ],
  properties: {
    full_name: { type: "number", minimum: 0, maximum: 1 },
    preferred_display_name: { type: "number", minimum: 0, maximum: 1 },
    email: { type: "number", minimum: 0, maximum: 1 },
    phone: { type: "number", minimum: 0, maximum: 1 },
    agency: { type: "number", minimum: 0, maximum: 1 },
    job_title: { type: "number", minimum: 0, maximum: 1 },
    years_experience: { type: "number", minimum: 0, maximum: 1 },
    service_areas: { type: "number", minimum: 0, maximum: 1 },
    specialties: { type: "number", minimum: 0, maximum: 1 },
    credentials: { type: "number", minimum: 0, maximum: 1 },
    languages: { type: "number", minimum: 0, maximum: 1 },
    professional_summary: { type: "number", minimum: 0, maximum: 1 },
    longer_bio: { type: "number", minimum: 0, maximum: 1 },
    notable_experience: { type: "number", minimum: 0, maximum: 1 },
    education: { type: "number", minimum: 0, maximum: 1 },
    awards_or_memberships: { type: "number", minimum: 0, maximum: 1 },
    social_links: { type: "number", minimum: 0, maximum: 1 },
    headshot_present: { type: "number", minimum: 0, maximum: 1 }
  }
} as const;

const resumeSourceDocumentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["document_id", "type"],
  properties: {
    document_id: { type: "string", minLength: 1, maxLength: 160 },
    type: {
      type: "string",
      enum: ["cv", "resume", "bio", "linkedin_pdf", "other"]
    }
  }
} as const;

const resumeNeedsConfirmationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["field", "reason"],
  properties: {
    field: { type: "string", minLength: 1, maxLength: 80 },
    reason: { type: "string", minLength: 1, maxLength: 240 }
  }
} as const;

const resumeExtractionProfileJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "full_name",
    "preferred_display_name",
    "email",
    "phone",
    "agency",
    "job_title",
    "years_experience",
    "service_areas",
    "specialties",
    "credentials",
    "languages",
    "professional_summary",
    "longer_bio",
    "notable_experience",
    "education",
    "awards_or_memberships",
    "social_links",
    "headshot_present",
    "source_documents",
    "confidence",
    "missing_fields",
    "needs_confirmation",
    "publish_readiness_score",
    "recommended_next_steps"
  ],
  properties: {
    full_name: { type: ["string", "null"], minLength: 1, maxLength: 120 },
    preferred_display_name: {
      type: ["string", "null"],
      minLength: 1,
      maxLength: 120
    },
    email: { type: ["string", "null"], minLength: 1, maxLength: 320 },
    phone: { type: ["string", "null"], minLength: 1, maxLength: 32 },
    agency: { type: ["string", "null"], minLength: 1, maxLength: 120 },
    job_title: { type: ["string", "null"], minLength: 1, maxLength: 120 },
    years_experience: { type: ["integer", "null"], minimum: 0, maximum: 60 },
    service_areas: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 40 },
      maxItems: 12
    },
    specialties: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 80 },
      maxItems: 12
    },
    credentials: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 80 },
      maxItems: 12
    },
    languages: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 40 },
      maxItems: 12
    },
    professional_summary: {
      type: ["string", "null"],
      minLength: 20,
      maxLength: 400
    },
    longer_bio: {
      type: ["string", "null"],
      minLength: 20,
      maxLength: 3000
    },
    notable_experience: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 140 },
      maxItems: 12
    },
    education: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 140 },
      maxItems: 12
    },
    awards_or_memberships: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 140 },
      maxItems: 12
    },
    social_links: {
      type: "object",
      additionalProperties: false,
      required: ["linkedin", "website", "instagram"],
      properties: {
        linkedin: { type: ["string", "null"], minLength: 1, maxLength: 300 },
        website: { type: ["string", "null"], minLength: 1, maxLength: 300 },
        instagram: { type: ["string", "null"], minLength: 1, maxLength: 300 }
      }
    },
    headshot_present: { type: "boolean" },
    source_documents: {
      type: "array",
      items: resumeSourceDocumentJsonSchema,
      minItems: 1,
      maxItems: 4
    },
    confidence: resumeProfileConfidenceJsonSchema,
    missing_fields: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 80 },
      maxItems: 24
    },
    needs_confirmation: {
      type: "array",
      items: resumeNeedsConfirmationJsonSchema,
      maxItems: 24
    },
    publish_readiness_score: { type: "integer", minimum: 0, maximum: 100 },
    recommended_next_steps: {
      type: "array",
      items: { type: "string", minLength: 1, maxLength: 140 },
      maxItems: 12
    }
  }
} as const;

const resumeExtractionSystemPrompt = `You are WHOMA Profile Extractor.
Convert uploaded professional documents into accurate, polished, structured estate-agent profiles.
Extract grounded facts, infer cautiously, never fabricate, and return only JSON matching the schema.
Use concise British English for summaries and public-facing copy.
Normalise service areas into concise UK location strings.
Normalise specialties into marketplace-friendly tags.
Set confidence scores using the evidence in the source material.
Return missing_fields, needs_confirmation, publish_readiness_score, and recommended_next_steps.
Only mark headshot_present as true if the source explicitly supports it.`;

const resumeCleanupSystemPrompt = `You are WHOMA Profile Cleaner.
Tighten and normalise an existing extracted profile without inventing any facts.
Preserve grounded values, keep concise British English, remove duplication, and return only JSON matching the schema.`;

function buildResumeExtractionJsonSchema() {
  return {
    type: "json_schema",
    name: "whoma_profile_extractor",
    strict: true,
    schema: resumeExtractionProfileJsonSchema
  } as const;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMultilineText(value: string): string {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function normalizeStringList(values: string[] | undefined, limit: number): string[] {
  if (!values) {
    return [];
  }

  return values
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .slice(0, limit);
}

function summarizeResumeText(text: string): string {
  const paragraphs = normalizeMultilineText(text)
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);

  const firstParagraph =
    paragraphs.find((paragraph) => paragraph.length >= 80) ??
    paragraphs[0] ??
    text;

  return firstParagraph.length > 360
    ? `${firstParagraph.slice(0, 357).trimEnd()}...`
    : firstParagraph;
}

function hasPrefillValues(prefill: ResumePrefillValues): boolean {
  return Object.values(prefill).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return Boolean(value);
  });
}

function createHeuristicHighlights(prefill: ResumePrefillValues): string[] {
  return [
    ...(prefill.fullName ? ["Detected a candidate name"] : []),
    ...(prefill.workEmail ? ["Detected an email address"] : []),
    ...(prefill.phone ? ["Detected a phone number"] : []),
    ...(prefill.agencyName ? ["Detected an agency or employer"] : []),
    ...(prefill.jobTitle ? ["Detected a likely job title"] : []),
    ...(prefill.yearsExperience !== undefined
      ? [`Detected approximately ${prefill.yearsExperience} years experience`]
      : []),
    ...(prefill.serviceAreas?.length
      ? [
          `Detected ${prefill.serviceAreas.length} service area${
            prefill.serviceAreas.length === 1 ? "" : "s"
          }`
        ]
      : []),
    ...(prefill.specialties?.length
      ? [
          `Detected ${prefill.specialties.length} specialty signal${
            prefill.specialties.length === 1 ? "" : "s"
          }`
        ]
      : [])
  ].slice(0, 8);
}

function createSuggestionId(): string {
  return `resume_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

function setPrefillValue(
  target: ResumePrefillValues,
  field: ResumeFieldKey,
  value: string | number | string[] | null | undefined
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (field === "yearsExperience" && typeof value === "number") {
    if (Number.isInteger(value) && value >= 0 && value <= 60) {
      target.yearsExperience = value;
    }
    return;
  }

  if (
    (field === "serviceAreas" || field === "specialties") &&
    Array.isArray(value)
  ) {
    const cleaned = value
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean)
      .slice(0, 12);

    if (cleaned.length > 0) {
      if (field === "serviceAreas") {
        target.serviceAreas = cleaned;
      } else {
        target.specialties = cleaned;
      }
    }
    return;
  }

  if (typeof value !== "string") {
    return;
  }

  const cleaned = normalizeWhitespace(value);
  if (!cleaned) {
    return;
  }

  if (field === "workEmail") {
    if (!isAcceptedWorkEmail(cleaned)) {
      return;
    }

    target.workEmail = cleaned.toLowerCase();
    return;
  }

  if (field === "serviceAreas" || field === "specialties") {
    return;
  }

  if (field === "yearsExperience") {
    return;
  }

  target[field] = cleaned;
}

function createSourceDocumentId(seed: string): string {
  return `doc_${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}

function createSourceDocument(input: {
  kind: "resume" | "cv" | "bio" | "linkedin_pdf" | "other";
  sourceLabel: string;
  sourceText: string;
}): ResumeSourceDocument {
  return {
    document_id: createSourceDocumentId(`${input.kind}:${input.sourceLabel}:${input.sourceText.slice(0, 256)}`),
    type: input.kind
  };
}

function normalizeSourceDocumentType(file: {
  name: string;
  mimeType: string;
}): ResumeSourceDocument["type"] {
  const lowerName = file.name.toLowerCase();
  if (lowerName.includes("linkedin")) {
    return "linkedin_pdf";
  }

  if (lowerName.includes("cv")) {
    return "cv";
  }

  if (file.mimeType.startsWith("image/")) {
    return "other";
  }

  return "resume";
}

function profileConfidenceToLegacyConfidence(
  profile: ResumeExtractionProfile
): ResumeSuggestionConfidence {
  return {
    ...(profile.confidence.full_name > 0 ? { fullName: profile.confidence.full_name } : {}),
    ...(profile.confidence.email > 0 ? { workEmail: profile.confidence.email } : {}),
    ...(profile.confidence.phone > 0 ? { phone: profile.confidence.phone } : {}),
    ...(profile.confidence.agency > 0 ? { agencyName: profile.confidence.agency } : {}),
    ...(profile.confidence.job_title > 0 ? { jobTitle: profile.confidence.job_title } : {}),
    ...(profile.confidence.years_experience > 0
      ? { yearsExperience: profile.confidence.years_experience }
      : {}),
    ...(profile.confidence.professional_summary > 0 ? { bio: profile.confidence.professional_summary } : {}),
    ...(profile.confidence.service_areas > 0 ? { serviceAreas: profile.confidence.service_areas } : {}),
    ...(profile.confidence.specialties > 0 ? { specialties: profile.confidence.specialties } : {})
  };
}

function profileToPrefill(profile: ResumeExtractionProfile): ResumePrefillValues {
  const prefill: ResumePrefillValues = {};

  setPrefillValue(prefill, "fullName", profile.full_name);
  setPrefillValue(prefill, "workEmail", profile.email);
  setPrefillValue(prefill, "phone", profile.phone);
  setPrefillValue(prefill, "agencyName", profile.agency);
  setPrefillValue(prefill, "jobTitle", profile.job_title);
  setPrefillValue(prefill, "yearsExperience", profile.years_experience);
  setPrefillValue(prefill, "bio", profile.professional_summary ?? profile.longer_bio ?? null);
  setPrefillValue(prefill, "serviceAreas", profile.service_areas);
  setPrefillValue(prefill, "specialties", profile.specialties);

  return prefill;
}

function createProfileDraftFromPrefill(
  prefill: ResumePrefillValues,
  sourceDocument: ResumeSourceDocument
): ResumeExtractionProfile {
  const bio = prefill.bio ?? null;
  const serviceAreas = normalizeStringList(prefill.serviceAreas, 12);
  const specialties = normalizeStringList(prefill.specialties, 12);

  return finalizeResumeProfile({
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
    professional_summary: bio,
    longer_bio: bio,
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
      professional_summary: bio ? 0.7 : 0,
      longer_bio: bio ? 0.7 : 0,
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
  });
}

function profileToLegacyEvidence(profile: ResumeExtractionProfile): ResumeSuggestionEvidence {
  const evidence: ResumeSuggestionEvidence = {};

  if (profile.full_name) {
    evidence.fullName = profile.full_name;
  }
  if (profile.email) {
    evidence.workEmail = profile.email;
  }
  if (profile.phone) {
    evidence.phone = profile.phone;
  }
  if (profile.agency) {
    evidence.agencyName = profile.agency;
  }
  if (profile.job_title) {
    evidence.jobTitle = profile.job_title;
  }
  if (profile.years_experience !== null) {
    evidence.yearsExperience = String(profile.years_experience);
  }
  if (profile.professional_summary) {
    evidence.bio = profile.professional_summary.slice(0, 260);
  }
  if (profile.service_areas.length > 0) {
    evidence.serviceAreas = profile.service_areas.join(", ");
  }
  if (profile.specialties.length > 0) {
    evidence.specialties = profile.specialties.join(", ");
  }

  return evidence;
}

function finalizeResumeProfile(profile: ResumeExtractionProfile): ResumeExtractionProfile {
  const next = normalizeProfileDraft(profile);
  const missingFields = new Set<string>();
  const needsConfirmation: ResumeNeedsConfirmation[] = [];

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

  const fieldChecks: Array<{
    field: keyof ResumeExtractionProfile["confidence"];
    valuePresent: boolean;
    required: boolean;
    missingLabel: string;
    confirmationReason: string;
  }> = [
    {
      field: "full_name",
      valuePresent: Boolean(next.full_name),
      required: true,
      missingLabel: "full_name",
      confirmationReason: "Confirm the agent's display name."
    },
    {
      field: "agency",
      valuePresent: Boolean(next.agency),
      required: true,
      missingLabel: "agency",
      confirmationReason: "Confirm the agency name."
    },
    {
      field: "job_title",
      valuePresent: Boolean(next.job_title),
      required: true,
      missingLabel: "job_title",
      confirmationReason: "Confirm the current job title."
    },
    {
      field: "service_areas",
      valuePresent: next.service_areas.length > 0,
      required: true,
      missingLabel: "service_areas",
      confirmationReason: "Confirm the main service areas."
    },
    {
      field: "specialties",
      valuePresent: next.specialties.length > 0,
      required: true,
      missingLabel: "specialties",
      confirmationReason: "Confirm the specialties shown on the profile."
    },
    {
      field: "professional_summary",
      valuePresent: Boolean(next.professional_summary),
      required: true,
      missingLabel: "professional_summary",
      confirmationReason: "Add or confirm the public summary."
    },
    {
      field: "email",
      valuePresent: Boolean(next.email),
      required: true,
      missingLabel: "email",
      confirmationReason: "Confirm the contact email."
    },
    {
      field: "phone",
      valuePresent: Boolean(next.phone),
      required: false,
      missingLabel: "phone",
      confirmationReason: "Confirm the contact number."
    },
    {
      field: "headshot_present",
      valuePresent: next.headshot_present,
      required: false,
      missingLabel: "headshot_present",
      confirmationReason: "Add a headshot if you want a stronger public profile."
    }
  ];

  let weightedScore = 0;
  for (const item of fieldChecks) {
    const confidenceValue = next.confidence[item.field] ?? 0;

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

  weightedScore += next.credentials.length > 0 ? fieldWeights.credentials ?? 0 : 0;
  weightedScore += next.languages.length > 0 ? fieldWeights.languages ?? 0 : 0;
  weightedScore += next.notable_experience.length > 0
    ? fieldWeights.notable_experience ?? 0
    : 0;
  weightedScore += next.education.length > 0 ? fieldWeights.education ?? 0 : 0;
  weightedScore += next.awards_or_memberships.length > 0
    ? fieldWeights.awards_or_memberships ?? 0
    : 0;

  if (next.social_links.linkedin || next.social_links.website || next.social_links.instagram) {
    weightedScore += 2;
  }

  next.missing_fields = Array.from(missingFields).slice(0, 24);
  next.needs_confirmation = needsConfirmation.slice(0, 24);
  next.publish_readiness_score = Math.max(0, Math.min(100, Math.round(weightedScore)));

  const nextSteps = new Set<string>();
  if (next.missing_fields.includes("full_name")) {
    nextSteps.add("Confirm the agent name");
  }
  if (next.missing_fields.includes("agency")) {
    nextSteps.add("Confirm the agency name");
  }
  if (next.missing_fields.includes("job_title")) {
    nextSteps.add("Add the current job title");
  }
  if (next.missing_fields.includes("service_areas")) {
    nextSteps.add("Add the main service areas");
  }
  if (next.missing_fields.includes("specialties")) {
    nextSteps.add("Add the core specialties");
  }
  if (next.missing_fields.includes("professional_summary")) {
    nextSteps.add("Write a short public summary");
  }
  if (next.missing_fields.includes("email")) {
    nextSteps.add("Add a contact email");
  }
  if (!next.headshot_present) {
    nextSteps.add("Upload a headshot");
  }
  if (next.needs_confirmation.length > 0) {
    nextSteps.add("Review the fields needing confirmation");
  }
  if (next.publish_readiness_score >= 75) {
    nextSteps.add("Publish the profile when you're happy with the draft");
  } else {
    nextSteps.add("Finish the missing fields before publishing");
  }

  next.recommended_next_steps = Array.from(nextSteps).slice(0, 12);

  return next;
}

function createResumeSummary(profile: ResumeExtractionProfile, fallbackText: string): string {
  return (
    profile.professional_summary ??
    profile.longer_bio ??
    summarizeResumeText(fallbackText) ??
    "Profile draft generated."
  ).slice(0, 400);
}

function createResumeHighlights(profile: ResumeExtractionProfile): string[] {
  const highlights: string[] = [];

  if (profile.full_name) {
    highlights.push("Captured the agent name");
  }
  if (profile.agency) {
    highlights.push("Captured the agency");
  }
  if (profile.job_title) {
    highlights.push("Captured the job title");
  }
  if (profile.service_areas.length > 0) {
    highlights.push(`Captured ${profile.service_areas.length} service area${profile.service_areas.length === 1 ? "" : "s"}`);
  }
  if (profile.specialties.length > 0) {
    highlights.push(`Captured ${profile.specialties.length} specialty tag${profile.specialties.length === 1 ? "" : "s"}`);
  }
  if (profile.email) {
    highlights.push("Captured the contact email");
  }
  if (profile.phone) {
    highlights.push("Captured the contact number");
  }

  return highlights.slice(0, 8);
}

function normalizeProfileDraft(profile: ResumeExtractionProfile): ResumeExtractionProfile {
  return {
    ...profile,
    full_name: profile.full_name ? normalizeWhitespace(profile.full_name) : null,
    preferred_display_name: profile.preferred_display_name ? normalizeWhitespace(profile.preferred_display_name) : null,
    email: profile.email ? profile.email.trim().toLowerCase() : null,
    phone: profile.phone ? normalizeWhitespace(profile.phone) : null,
    agency: profile.agency ? normalizeWhitespace(profile.agency) : null,
    job_title: profile.job_title ? normalizeWhitespace(profile.job_title) : null,
    years_experience: profile.years_experience,
    service_areas: profile.service_areas.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12),
    specialties: profile.specialties.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12),
    credentials: profile.credentials.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12),
    languages: profile.languages.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12),
    professional_summary: profile.professional_summary ? normalizeWhitespace(profile.professional_summary).slice(0, 400) : null,
    longer_bio: profile.longer_bio ? normalizeMultilineText(profile.longer_bio).slice(0, 3000) : null,
    notable_experience: profile.notable_experience.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12),
    education: profile.education.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12),
    awards_or_memberships: profile.awards_or_memberships.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12),
    social_links: {
      linkedin: profile.social_links.linkedin ? normalizeWhitespace(profile.social_links.linkedin) : null,
      website: profile.social_links.website ? normalizeWhitespace(profile.social_links.website) : null,
      instagram: profile.social_links.instagram ? normalizeWhitespace(profile.social_links.instagram) : null
    },
    source_documents: profile.source_documents.map((item) => resumeSourceDocumentSchema.parse(item)),
    confidence: resumeProfileConfidenceSchema.parse(profile.confidence),
    missing_fields: profile.missing_fields.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 24),
    needs_confirmation: profile.needs_confirmation.map((item) => resumeNeedsConfirmationSchema.parse(item)).slice(0, 24),
    recommended_next_steps: profile.recommended_next_steps.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12)
  };
}

function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const jsonFence = /```json\s*([\s\S]*?)```/i.exec(trimmed);
  if (jsonFence?.[1]) {
    return jsonFence[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new ResumeExtractionError(
      "LLM_UNAVAILABLE",
      "Resume extraction provider returned an invalid response shape."
    );
  }

  return trimmed.slice(firstBrace, lastBrace + 1).trim();
}

export function parseResumeLlmExtractionResult(raw: string): ResumeExtractionProfile {
  const json = extractJsonBlock(raw);
  const parsed = JSON.parse(json) as unknown;
  return resumeExtractionProfileSchema.parse(parsed);
}

function extractResponseOutputText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const record = payload as {
    output_text?: unknown;
    output?: unknown;
  };

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  if (!Array.isArray(record.output)) {
    return null;
  }

  const chunks: string[] = [];

  for (const outputItem of record.output) {
    if (typeof outputItem !== "object" || outputItem === null) {
      continue;
    }

    const content = (outputItem as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const contentItem of content) {
      if (typeof contentItem !== "object" || contentItem === null) {
        continue;
      }

      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        chunks.push(text);
      }
    }
  }

  if (chunks.length === 0) {
    return null;
  }

  return chunks.join("\n");
}

async function requestOpenAiResumeProfile(input: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs: number;
}): Promise<ResumeExtractionProfile> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ResumeExtractionError(
      "LLM_UNAVAILABLE",
      "LLM resume extraction is not configured."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0,
        text: {
          format: buildResumeExtractionJsonSchema()
        },
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: input.systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: input.userPrompt }]
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = await response.text();
      }

      throw new ResumeExtractionError(
        "LLM_UNAVAILABLE",
        "LLM resume extraction request failed.",
        { status: response.status, details }
      );
    }

    const payload = (await response.json()) as unknown;
    const outputText = extractResponseOutputText(payload);

    if (!outputText) {
      throw new ResumeExtractionError(
        "LLM_UNAVAILABLE",
        "LLM resume extraction returned no text output."
      );
    }

    return parseResumeLlmExtractionResult(outputText);
  } catch (error) {
    if (error instanceof ResumeExtractionError) {
      throw error;
    }

    if ((error as { name?: string }).name === "AbortError") {
      throw new ResumeExtractionError(
        "LLM_UNAVAILABLE",
        "LLM resume extraction timed out."
      );
    }

    throw new ResumeExtractionError(
      "LLM_UNAVAILABLE",
      "LLM resume extraction failed unexpectedly."
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function buildResumeExtractionPrompt(input: {
  sourceText: string;
  sourceDocument: ResumeSourceDocument;
  existingProfile?: ResumePrefillValues | undefined;
}): ResumeLlmPromptBundle {
  const existingProfileJson = JSON.stringify(input.existingProfile ?? {}, null, 2);
  const sourceDocumentJson = JSON.stringify(input.sourceDocument, null, 2);

  const userPrompt = `Extract a WHOMA agent profile from the source material below.

Return one JSON object that matches the schema exactly.
Use grounded facts only. If a value is uncertain, use null or an empty array and reflect that in missing_fields or needs_confirmation.
Keep the writing concise, credible, and in British English.
Normalise service areas into concise UK location strings.
Normalise specialties into marketplace-friendly tags.
Populate source_documents with the provided document details and echo the document_id exactly.

Current known values (optional):
${existingProfileJson}

Source document:
${sourceDocumentJson}

Source text:
<<<
${input.sourceText}
>>>`;

  return {
    systemPrompt: resumeExtractionSystemPrompt,
    userPrompt
  };
}

function buildResumeCleanupPrompt(input: {
  sourceText: string;
  sourceDocument: ResumeSourceDocument;
  profile: ResumeExtractionProfile;
}): ResumeLlmPromptBundle {
  const profileJson = JSON.stringify(input.profile, null, 2);
  const sourceDocumentJson = JSON.stringify(input.sourceDocument, null, 2);

  const userPrompt = `Normalise this draft WHOMA profile without inventing anything.
Preserve grounded facts, tighten the British English copy, dedupe repeated items, and keep the schema exactly as required.

Source document:
${sourceDocumentJson}

Draft profile:
${profileJson}

Source text:
<<<
${input.sourceText}
>>>`;

  return {
    systemPrompt: resumeCleanupSystemPrompt,
    userPrompt
  };
}

async function callOpenAiResumeExtractor(input: {
  sourceText: string;
  sourceDocument: ResumeSourceDocument;
  existingProfile?: ResumePrefillValues | undefined;
  timeoutMs: number;
  model: string;
}): Promise<ResumeExtractionProfile> {
  const { systemPrompt, userPrompt } = buildResumeExtractionPrompt({
    sourceText: input.sourceText,
    sourceDocument: input.sourceDocument,
    existingProfile: input.existingProfile
  });

  const result = await requestOpenAiResumeProfile({
    model: input.model,
    systemPrompt,
    userPrompt,
    timeoutMs: input.timeoutMs
  });

  return normalizeProfileDraft(result);
}

async function callOpenAiResumeCleanup(input: {
  sourceText: string;
  sourceDocument: ResumeSourceDocument;
  profile: ResumeExtractionProfile;
  timeoutMs: number;
  model: string;
}): Promise<ResumeExtractionProfile> {
  const { systemPrompt, userPrompt } = buildResumeCleanupPrompt({
    sourceText: input.sourceText,
    sourceDocument: input.sourceDocument,
    profile: input.profile
  });

  const result = await requestOpenAiResumeProfile({
    model: input.model,
    systemPrompt,
    userPrompt,
    timeoutMs: input.timeoutMs
  });

  return normalizeProfileDraft(result);
}

async function runOcrFallback(file: File): Promise<string> {
  const stubText = process.env.RESUME_OCR_STUB_TEXT?.trim();
  if (stubText) {
    return stubText;
  }

  const endpoint = process.env.RESUME_OCR_ENDPOINT?.trim();
  if (!endpoint) {
    throw new ResumeExtractionError(
      "OCR_UNAVAILABLE",
      "OCR fallback is enabled but no OCR provider is configured."
    );
  }

  const authToken = process.env.RESUME_OCR_API_KEY?.trim();
  const buffer = Buffer.from(await file.arrayBuffer());
  const payload = {
    fileName: file.name,
    mimeType: file.type,
    contentBase64: buffer.toString("base64")
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    throw new ResumeExtractionError("OCR_UNAVAILABLE", "OCR provider request failed.", {
      status: response.status,
      details
    });
  }

  const parsed = (await response.json()) as { text?: unknown };
  if (typeof parsed.text !== "string" || parsed.text.trim().length === 0) {
    throw new ResumeExtractionError(
      "OCR_UNAVAILABLE",
      "OCR provider returned no extracted text."
    );
  }

  return parsed.text;
}

function resolvePipelineMode(
  requestedMode: ResumePipelineMode | undefined,
  defaultMode: ResumePipelineMode
): ResumePipelineMode {
  if (
    requestedMode === "heuristic" ||
    requestedMode === "hybrid" ||
    requestedMode === "llm_only"
  ) {
    return requestedMode;
  }

  return defaultMode;
}

export async function createResumeSuggestionsFromFile(input: {
  file?: File;
  bioText?: string;
  mode?: ResumePipelineMode | undefined;
  existingProfile?: ResumePrefillValues | undefined;
}): Promise<ResumeIntakeResult> {
  const startedAt = Date.now();
  const flags = getResumeFeatureFlags();
  const selectedMode = resolvePipelineMode(input.mode, flags.resumePrefillMode);

  if (selectedMode === "llm_only" && !flags.enableResumeAiPrefill) {
    throw new ResumeExtractionError(
      "LLM_UNAVAILABLE",
      "LLM resume extraction is disabled by configuration."
    );
  }

  let meta:
    | {
        name: string;
        mimeType: string;
        size: number;
        extension: string;
      }
    | null = null;
  let sourceDocument: ResumeSourceDocument | null = null;
  let normalizedText = "";
  let ocrUsed = false;

  if (input.file) {
    const maxBytes = flags.resumeMaxFileMb * 1024 * 1024;
    meta = validateResumeUploadFile(input.file, { maxBytes });
    const sourceType = normalizeSourceDocumentType(meta);

    try {
      normalizedText = normalizeMultilineText(
        await extractResumeTextFromFile(input.file, { maxBytes })
      ).slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    } catch (error) {
      if (!(error instanceof ResumeExtractionError)) {
        throw error;
      }

      if (
        error.code === "PARSE_FAILED" &&
        flags.enableResumeOcrFallback
      ) {
        const ocrText = await runOcrFallback(input.file);
        normalizedText = normalizeMultilineText(ocrText).slice(0, MAX_EXTRACTED_TEXT_LENGTH);
        ocrUsed = true;
      } else if (
        error.code === "PARSE_FAILED" &&
        !flags.enableResumeOcrFallback &&
        meta.mimeType.startsWith("image/")
      ) {
        throw new ResumeExtractionError(
          "OCR_UNAVAILABLE",
          "Image resumes require OCR fallback, which is currently disabled.",
          {
            mimeType: meta.mimeType,
            extension: meta.extension
          }
        );
      } else {
        throw error;
      }
    }

    if (normalizedText.length < MIN_USABLE_TEXT_LENGTH) {
      if (!flags.enableResumeOcrFallback) {
        throw new ResumeExtractionError(
          "TEXT_TOO_SHORT",
          "We could not extract enough text from that resume to generate useful suggestions.",
          {
            extractedCharacters: normalizedText.length,
            minimumCharacters: MIN_USABLE_TEXT_LENGTH
          }
        );
      }

      const ocrText = await runOcrFallback(input.file);
      normalizedText = normalizeMultilineText(ocrText).slice(0, MAX_EXTRACTED_TEXT_LENGTH);
      ocrUsed = true;

      if (normalizedText.length < MIN_USABLE_TEXT_LENGTH) {
        throw new ResumeExtractionError(
          "OCR_UNAVAILABLE",
          "OCR fallback returned too little text to extract onboarding fields.",
          {
            extractedCharacters: normalizedText.length,
            minimumCharacters: MIN_USABLE_TEXT_LENGTH
          }
        );
      }
    }

    sourceDocument = createSourceDocument({
      kind: sourceType,
      sourceLabel: meta.name,
      sourceText: normalizedText
    });
  } else if (typeof input.bioText === "string" && input.bioText.trim().length > 0) {
    normalizedText = normalizeMultilineText(input.bioText).slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    meta = {
      name: "pasted-bio.txt",
      mimeType: "text/plain",
      size: Buffer.byteLength(normalizedText, "utf8"),
      extension: ".txt"
    };
    sourceDocument = createSourceDocument({
      kind: "bio",
      sourceLabel: meta.name,
      sourceText: normalizedText
    });
  } else {
    throw new ResumeExtractionError("FILE_MISSING", "Please choose a resume file or paste a bio.");
  }

  if (!sourceDocument) {
    throw new ResumeExtractionError(
      "FILE_MISSING",
      "Please choose a resume file or paste a bio."
    );
  }

  if (normalizedText.length < MIN_USABLE_TEXT_LENGTH) {
    throw new ResumeExtractionError(
      "TEXT_TOO_SHORT",
      "We could not extract enough text to generate useful suggestions.",
      {
        extractedCharacters: normalizedText.length,
        minimumCharacters: MIN_USABLE_TEXT_LENGTH
      }
    );
  }

  const heuristicPrefill = deriveResumePrefillValues(normalizedText);
  const heuristicHighlights = createHeuristicHighlights(heuristicPrefill);
  const warnings: string[] = [];

  const heuristicProfile = createProfileDraftFromPrefill(
    heuristicPrefill,
    sourceDocument
  );

  let finalProfile = heuristicProfile;
  let llmUsed = false;

  const shouldAttemptLlm =
    flags.enableResumeAiPrefill &&
    (selectedMode !== "heuristic" || flags.resumeAiShadowMode);

  if (shouldAttemptLlm) {
    try {
      const llmProfile = await callOpenAiResumeExtractor({
        sourceText: normalizedText.slice(0, MAX_LLM_INPUT_CHARACTERS),
        sourceDocument,
        existingProfile: input.existingProfile,
        timeoutMs: flags.resumeLlmTimeoutMs,
        model: flags.resumeLlmModel
      });

      llmUsed = true;
      finalProfile = llmProfile;

      if (
        !flags.resumeAiShadowMode &&
        flags.resumeCleanupModel !== flags.resumeLlmModel &&
        (llmProfile.publish_readiness_score < 70 ||
          llmProfile.needs_confirmation.length > 2)
      ) {
        try {
          finalProfile = await callOpenAiResumeCleanup({
            sourceText: normalizedText.slice(0, MAX_LLM_INPUT_CHARACTERS),
            sourceDocument,
            profile: llmProfile,
            timeoutMs: flags.resumeLlmTimeoutMs,
            model: flags.resumeCleanupModel
          });
          warnings.push("Ran a cleanup pass to normalise the drafted profile.");
        } catch (cleanupError) {
          if (cleanupError instanceof ResumeExtractionError) {
            warnings.push("Cleanup pass unavailable; using the primary extraction.");
          } else {
            throw cleanupError;
          }
        }
      }
    } catch (error) {
      if (!(error instanceof ResumeExtractionError)) {
        throw error;
      }

      if (selectedMode === "llm_only" && !hasPrefillValues(heuristicPrefill)) {
        throw error;
      }

      warnings.push("LLM extraction unavailable; using deterministic extraction.");
    }
  }

  if (
    selectedMode === "hybrid" &&
    !flags.resumeAiShadowMode &&
    llmUsed
  ) {
    finalProfile = finalizeResumeProfile({
      ...heuristicProfile,
      ...finalProfile,
      social_links: {
        ...heuristicProfile.social_links,
        ...finalProfile.social_links
      },
      source_documents:
        finalProfile.source_documents.length > 0
          ? finalProfile.source_documents
          : heuristicProfile.source_documents,
      confidence: {
        ...heuristicProfile.confidence,
        ...finalProfile.confidence
      },
      missing_fields:
        finalProfile.missing_fields.length > 0
          ? finalProfile.missing_fields
          : heuristicProfile.missing_fields,
      needs_confirmation:
        finalProfile.needs_confirmation.length > 0
          ? finalProfile.needs_confirmation
          : heuristicProfile.needs_confirmation,
      recommended_next_steps:
        finalProfile.recommended_next_steps.length > 0
          ? finalProfile.recommended_next_steps
          : heuristicProfile.recommended_next_steps
    });
  }

  if (
    selectedMode === "llm_only" &&
    !flags.resumeAiShadowMode &&
    llmUsed &&
    !hasPrefillValues(profileToPrefill(finalProfile))
  ) {
    finalProfile = createProfileDraftFromPrefill(heuristicPrefill, sourceDocument);
  }

  if (!llmUsed || selectedMode === "heuristic" || flags.resumeAiShadowMode) {
    finalProfile = heuristicProfile;
  }

  if (!hasPrefillValues(profileToPrefill(finalProfile))) {
    throw new ResumeExtractionError(
      "NO_SUGGESTIONS",
      "We could not confidently extract any onboarding fields from that resume.",
      {
        extractedCharacters: normalizedText.length
      }
    );
  }

  finalProfile = finalizeResumeProfile(finalProfile);

  const finalPrefill = profileToPrefill(finalProfile);
  const finalConfidence = profileConfidenceToLegacyConfidence(finalProfile);
  const finalEvidence = profileToLegacyEvidence(finalProfile);

  if (
    !flags.resumeAiShadowMode &&
    selectedMode !== "heuristic" &&
    hasPrefillValues(heuristicPrefill) &&
    !hasPrefillValues(finalPrefill)
  ) {
    warnings.push(
      "Primary extraction yielded low-confidence fields; reverted to deterministic extraction."
    );
  }

  const suggestion: ResumeSuggestions = {
    version: 3,
    suggestionId: createSuggestionId(),
    sourceFileName: meta.name,
    sourceMimeType: meta.mimeType,
    extractedAtIso: new Date().toISOString(),
    extractedTextLength: normalizedText.length,
    summary: createResumeSummary(finalProfile, normalizedText),
    highlights:
      !flags.resumeAiShadowMode && selectedMode !== "heuristic" && llmUsed
        ? createResumeHighlights(finalProfile)
        : heuristicHighlights,
    profile: finalProfile,
    prefill: finalPrefill,
    confidence: finalConfidence,
    evidence: finalEvidence,
    warnings: warnings.slice(0, 12)
  };

  return {
    suggestion,
    pipeline: {
      mode: selectedMode,
      ocrUsed,
      llmUsed,
      durationMs: Date.now() - startedAt
    }
  };
}
