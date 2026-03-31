export type ResumePipelineMode = "heuristic" | "hybrid" | "llm_only";

export type ResumeFeatureFlags = {
  enableResumeAiPrefill: boolean;
  resumePrefillMode: ResumePipelineMode;
  enableResumeOcrFallback: boolean;
  resumeLlmProvider: "openai";
  resumeLlmModel: string;
  resumeLlmTimeoutMs: number;
  resumeMinConfidence: number;
  resumeAiShadowMode: boolean;
  resumeUploadLimitPerHour: number;
  resumeMaxFileMb: number;
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function parseBooleanFlag(
  raw: string | undefined,
  defaults: { dev: boolean; prod: boolean }
): boolean {
  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  return isProduction() ? defaults.prod : defaults.dev;
}

function parseIntegerFlag(
  raw: string | undefined,
  fallback: number,
  options: { min: number; max: number }
): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  if (parsed < options.min || parsed > options.max) {
    return fallback;
  }

  return parsed;
}

function parseFloatFlag(
  raw: string | undefined,
  fallback: number,
  options: { min: number; max: number }
): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < options.min || parsed > options.max) {
    return fallback;
  }

  return parsed;
}

function parseMode(raw: string | undefined, fallback: ResumePipelineMode): ResumePipelineMode {
  if (raw === "heuristic" || raw === "hybrid" || raw === "llm_only") {
    return raw;
  }

  return fallback;
}

export function getResumeFeatureFlags(): ResumeFeatureFlags {
  return {
    enableResumeAiPrefill: parseBooleanFlag(process.env.ENABLE_RESUME_AI_PREFILL, {
      dev: true,
      prod: false
    }),
    resumePrefillMode: parseMode(
      process.env.RESUME_PREFILL_MODE,
      isProduction() ? "heuristic" : "hybrid"
    ),
    enableResumeOcrFallback: parseBooleanFlag(
      process.env.ENABLE_RESUME_OCR_FALLBACK,
      { dev: true, prod: false }
    ),
    resumeLlmProvider: "openai",
    resumeLlmModel: process.env.RESUME_LLM_MODEL?.trim() || "gpt-5.4-mini",
    resumeLlmTimeoutMs: parseIntegerFlag(process.env.RESUME_LLM_TIMEOUT_MS, 8000, {
      min: 1000,
      max: 60000
    }),
    resumeMinConfidence: parseFloatFlag(
      process.env.RESUME_MIN_CONFIDENCE,
      isProduction() ? 0.78 : 0.72,
      { min: 0, max: 1 }
    ),
    resumeAiShadowMode: parseBooleanFlag(process.env.RESUME_AI_SHADOW_MODE, {
      dev: false,
      prod: true
    }),
    resumeUploadLimitPerHour: parseIntegerFlag(
      process.env.RESUME_UPLOAD_LIMIT_PER_HOUR,
      6,
      {
        min: 1,
        max: 500
      }
    ),
    resumeMaxFileMb: parseIntegerFlag(process.env.RESUME_MAX_FILE_MB, 4, {
      min: 1,
      max: 25
    })
  };
}
