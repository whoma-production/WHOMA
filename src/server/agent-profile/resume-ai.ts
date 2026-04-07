import crypto from "node:crypto";

import { z } from "zod";

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
  ResumePrefillValues,
  ResumeSuggestionConfidence,
  ResumeSuggestionEvidence,
  ResumeSuggestions
} from "@/server/agent-profile/resume-suggestions-cookie";

const MIN_USABLE_TEXT_LENGTH = 120;
const MAX_EXTRACTED_TEXT_LENGTH = 25_000;
const MAX_LLM_INPUT_CHARACTERS = 12_000;

const resumeFieldKeys = [
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

type ResumeFieldKey = (typeof resumeFieldKeys)[number];

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

const resumeLlmFieldResultSchema = z
  .object({
    value: z.union([z.string(), z.number(), z.array(z.string()), z.null()]).optional(),
    confidence: z.number().min(0).max(1).optional(),
    evidence: z.union([z.string(), z.null()]).optional()
  })
  .strict();

const resumeLlmExtractionSchema = z
  .object({
    summary: z.string().trim().max(400).optional(),
    highlights: z.array(z.string().trim().min(1).max(140)).max(8).optional(),
    warnings: z.array(z.string().trim().min(1).max(200)).max(12).optional(),
    fields: z
      .object({
        fullName: resumeLlmFieldResultSchema.optional(),
        workEmail: resumeLlmFieldResultSchema.optional(),
        phone: resumeLlmFieldResultSchema.optional(),
        agencyName: resumeLlmFieldResultSchema.optional(),
        jobTitle: resumeLlmFieldResultSchema.optional(),
        yearsExperience: resumeLlmFieldResultSchema.optional(),
        bio: resumeLlmFieldResultSchema.optional(),
        serviceAreas: resumeLlmFieldResultSchema.optional(),
        specialties: resumeLlmFieldResultSchema.optional()
      })
      .strict()
      .optional()
  })
  .strict();

type ResumeLlmExtractionResult = z.infer<typeof resumeLlmExtractionSchema>;

const resumeExtractionSystemPrompt = `You extract onboarding fields for UK estate-agent profiles.
Return strict JSON only.
Use only information present in the document.
If uncertain, return null/omit and lower confidence.
Normalize outputs for these fields only:
fullName, workEmail, phone, agencyName, jobTitle, yearsExperience, bio, serviceAreas, specialties.
serviceAreas must be UK postcode districts (e.g., SW1A, SE1).
workEmail should be a valid email address.
Do not invent achievements, sales numbers, awards, or credentials.`;

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

function createHeuristicConfidence(
  prefill: ResumePrefillValues
): ResumeSuggestionConfidence {
  return {
    ...(prefill.fullName ? { fullName: 0.78 } : {}),
    ...(prefill.workEmail ? { workEmail: 0.92 } : {}),
    ...(prefill.phone ? { phone: 0.86 } : {}),
    ...(prefill.agencyName ? { agencyName: 0.72 } : {}),
    ...(prefill.jobTitle ? { jobTitle: 0.74 } : {}),
    ...(prefill.yearsExperience !== undefined ? { yearsExperience: 0.75 } : {}),
    ...(prefill.bio ? { bio: 0.7 } : {}),
    ...(prefill.serviceAreas?.length ? { serviceAreas: 0.82 } : {}),
    ...(prefill.specialties?.length ? { specialties: 0.8 } : {})
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

function applyConfidenceThreshold(
  prefill: ResumePrefillValues,
  confidence: ResumeSuggestionConfidence,
  threshold: number
): ResumePrefillValues {
  const next: ResumePrefillValues = {};

  for (const field of resumeFieldKeys) {
    const confidenceValue = confidence[field];
    if (confidenceValue === undefined || confidenceValue < threshold) {
      continue;
    }

    setPrefillValue(next, field, prefill[field]);
  }

  return next;
}

function parseLlmFieldValues(result: ResumeLlmExtractionResult): {
  prefill: ResumePrefillValues;
  confidence: ResumeSuggestionConfidence;
  evidence: ResumeSuggestionEvidence;
} {
  const prefill: ResumePrefillValues = {};
  const confidence: ResumeSuggestionConfidence = {};
  const evidence: ResumeSuggestionEvidence = {};

  for (const field of resumeFieldKeys) {
    const rawField = result.fields?.[field];
    if (!rawField) {
      continue;
    }

    setPrefillValue(prefill, field, rawField.value);

    const confidenceValue = rawField.confidence;
    if (
      confidenceValue !== undefined &&
      Number.isFinite(confidenceValue) &&
      confidenceValue >= 0 &&
      confidenceValue <= 1
    ) {
      confidence[field] = confidenceValue;
    }

    const evidenceValue = rawField.evidence;
    if (typeof evidenceValue === "string" && evidenceValue.trim().length > 0) {
      evidence[field] = normalizeWhitespace(evidenceValue).slice(0, 280);
    }
  }

  return { prefill, confidence, evidence };
}

export function buildResumeExtractionPrompt(input: {
  resumeText: string;
  existingProfile?: ResumePrefillValues | undefined;
}): ResumeLlmPromptBundle {
  const existingProfileJson = JSON.stringify(input.existingProfile ?? {}, null, 2);

  const userPrompt = `Task: Extract profile prefill suggestions from this resume text.

Current known values (optional):
${existingProfileJson}

Resume text:
<<<
${input.resumeText}
>>>

Return JSON matching this shape exactly:
{
  "summary": "string <= 400",
  "highlights": ["string"],
  "fields": {
    "fullName": {"value": "string|null", "confidence": 0.0, "evidence": "string|null"},
    "workEmail": {"value": "string|null", "confidence": 0.0, "evidence": "string|null"},
    "phone": {"value": "string|null", "confidence": 0.0, "evidence": "string|null"},
    "agencyName": {"value": "string|null", "confidence": 0.0, "evidence": "string|null"},
    "jobTitle": {"value": "string|null", "confidence": 0.0, "evidence": "string|null"},
    "yearsExperience": {"value": "number|null", "confidence": 0.0, "evidence": "string|null"},
    "bio": {"value": "string|null", "confidence": 0.0, "evidence": "string|null"},
    "serviceAreas": {"value": ["string"], "confidence": 0.0, "evidence": "string|null"},
    "specialties": {"value": ["string"], "confidence": 0.0, "evidence": "string|null"}
  },
  "warnings": ["string"]
}`;

  return {
    systemPrompt: resumeExtractionSystemPrompt,
    userPrompt
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

export function parseResumeLlmExtractionResult(
  raw: string
): ResumeLlmExtractionResult {
  const json = extractJsonBlock(raw);
  const parsed = JSON.parse(json) as unknown;
  return resumeLlmExtractionSchema.parse(parsed);
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

async function callOpenAiResumeExtractor(input: {
  text: string;
  existingProfile?: ResumePrefillValues | undefined;
  timeoutMs: number;
  model: string;
}): Promise<ResumeLlmExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ResumeExtractionError(
      "LLM_UNAVAILABLE",
      "LLM resume extraction is not configured."
    );
  }

  const { systemPrompt, userPrompt } = buildResumeExtractionPrompt({
    resumeText: input.text,
    existingProfile: input.existingProfile
  });

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
        temperature: 0.1,
        input: [
          {
            role: "system",
            content: [{ type: "text", text: systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "text", text: userPrompt }]
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
  file: File;
  mode?: ResumePipelineMode | undefined;
  existingProfile?: ResumePrefillValues | undefined;
}): Promise<ResumeIntakeResult> {
  const startedAt = Date.now();
  const flags = getResumeFeatureFlags();
  const maxBytes = flags.resumeMaxFileMb * 1024 * 1024;
  const meta = validateResumeUploadFile(input.file, { maxBytes });
  const selectedMode = resolvePipelineMode(input.mode, flags.resumePrefillMode);

  if (selectedMode === "llm_only" && !flags.enableResumeAiPrefill) {
    throw new ResumeExtractionError(
      "LLM_UNAVAILABLE",
      "LLM resume extraction is disabled by configuration."
    );
  }

  let normalizedText = normalizeMultilineText(
    await extractResumeTextFromFile(input.file, { maxBytes })
  ).slice(0, MAX_EXTRACTED_TEXT_LENGTH);
  let ocrUsed = false;
  let llmUsed = false;

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

  const heuristicPrefill = deriveResumePrefillValues(normalizedText);
  const heuristicSummary = summarizeResumeText(normalizedText);
  const heuristicHighlights = createHeuristicHighlights(heuristicPrefill);
  const heuristicConfidence = createHeuristicConfidence(heuristicPrefill);
  const heuristicEvidence = createHeuristicEvidence(heuristicPrefill);
  const warnings: string[] = [];

  let llmPrefill: ResumePrefillValues = {};
  let llmConfidence: ResumeSuggestionConfidence = {};
  let llmEvidence: ResumeSuggestionEvidence = {};
  let llmSummary: string | undefined;
  let llmHighlights: string[] | undefined;

  const shouldAttemptLlm =
    flags.enableResumeAiPrefill &&
    (selectedMode !== "heuristic" || flags.resumeAiShadowMode);

  if (shouldAttemptLlm) {
    try {
      const llmResult = await callOpenAiResumeExtractor({
        text: normalizedText.slice(0, MAX_LLM_INPUT_CHARACTERS),
        existingProfile: input.existingProfile,
        timeoutMs: flags.resumeLlmTimeoutMs,
        model: flags.resumeLlmModel
      });

      const parsedFields = parseLlmFieldValues(llmResult);
      llmPrefill = parsedFields.prefill;
      llmConfidence = parsedFields.confidence;
      llmEvidence = parsedFields.evidence;
      llmSummary = llmResult.summary;
      llmHighlights = llmResult.highlights;
      warnings.push(...(llmResult.warnings ?? []));
      llmUsed = true;
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

  const llmFilteredPrefill = applyConfidenceThreshold(
    llmPrefill,
    llmConfidence,
    flags.resumeMinConfidence
  );

  const finalPrefill: ResumePrefillValues = {};
  const finalConfidence: ResumeSuggestionConfidence = {};
  const finalEvidence: ResumeSuggestionEvidence = {};

  if (selectedMode === "llm_only" && !flags.resumeAiShadowMode) {
    for (const field of resumeFieldKeys) {
      setPrefillValue(finalPrefill, field, llmFilteredPrefill[field]);

      if (llmConfidence[field] !== undefined) {
        finalConfidence[field] = llmConfidence[field];
      }

      if (llmEvidence[field] !== undefined) {
        finalEvidence[field] = llmEvidence[field];
      }
    }
  } else {
    for (const field of resumeFieldKeys) {
      setPrefillValue(finalPrefill, field, heuristicPrefill[field]);

      if (heuristicConfidence[field] !== undefined) {
        finalConfidence[field] = heuristicConfidence[field];
      }

      if (heuristicEvidence[field] !== undefined) {
        finalEvidence[field] = heuristicEvidence[field];
      }
    }

    if (!flags.resumeAiShadowMode && selectedMode === "hybrid") {
      for (const field of resumeFieldKeys) {
        if (llmFilteredPrefill[field] !== undefined) {
          setPrefillValue(finalPrefill, field, llmFilteredPrefill[field]);
        }

        if (llmConfidence[field] !== undefined) {
          finalConfidence[field] = llmConfidence[field];
        }

        if (llmEvidence[field] !== undefined) {
          finalEvidence[field] = llmEvidence[field];
        }
      }
    }
  }

  if (!hasPrefillValues(finalPrefill) && hasPrefillValues(heuristicPrefill)) {
    for (const field of resumeFieldKeys) {
      setPrefillValue(finalPrefill, field, heuristicPrefill[field]);
    }

    warnings.push(
      "Primary extraction yielded low-confidence fields; reverted to deterministic extraction."
    );
  }

  if (!hasPrefillValues(finalPrefill)) {
    throw new ResumeExtractionError(
      "NO_SUGGESTIONS",
      "We could not confidently extract any onboarding fields from that resume.",
      {
        extractedCharacters: normalizedText.length
      }
    );
  }

  const suggestion: ResumeSuggestions = {
    version: 2,
    suggestionId: createSuggestionId(),
    sourceFileName: meta.name,
    sourceMimeType: meta.mimeType,
    extractedAtIso: new Date().toISOString(),
    extractedTextLength: normalizedText.length,
    summary:
      (selectedMode !== "heuristic" && llmSummary && !flags.resumeAiShadowMode
        ? normalizeWhitespace(llmSummary).slice(0, 400)
        : heuristicSummary) || heuristicSummary,
    highlights:
      selectedMode !== "heuristic" &&
      llmHighlights &&
      llmHighlights.length > 0 &&
      !flags.resumeAiShadowMode
        ? llmHighlights
            .map((highlight) => normalizeWhitespace(highlight))
            .slice(0, 8)
        : heuristicHighlights,
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
