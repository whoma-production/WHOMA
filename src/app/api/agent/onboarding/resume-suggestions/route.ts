import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth, type AuthSession } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import {
  createRequestHash,
  executeIdempotentRequest,
  getIdempotencyErrorStatus,
  IdempotencyError
} from "@/server/http/idempotency";
import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";
import {
  createResumeSuggestionsFromFile,
  type ResumePipelineMeta
} from "@/server/agent-profile/resume-ai";
import { getResumeFeatureFlags } from "@/server/agent-profile/resume-flags";
import {
  decodeResumeSuggestionsCookie,
  encodeResumeSuggestionsCookie,
  RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS,
  RESUME_SUGGESTIONS_COOKIE_NAME,
  type ResumeSuggestions
} from "@/server/agent-profile/resume-suggestions-cookie";
import { ResumeExtractionError } from "@/server/agent-profile/resume-intake";

const modeSchema = z.enum(["heuristic", "hybrid", "llm_only"]);

function isFileLike(value: FormDataEntryValue | null): value is File {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    name?: unknown;
    size?: unknown;
    type?: unknown;
    arrayBuffer?: unknown;
  };

  return (
    typeof candidate.name === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function"
  );
}

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit
): Response {
  const init: ResponseInit = headers ? { status, headers } : { status };

  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details }
    },
    init
  );
}

function jsonSuccess(
  status: number,
  data: unknown,
  headers?: HeadersInit
): Response {
  const init: ResponseInit = headers ? { status, headers } : { status };

  return NextResponse.json(
    {
      ok: true,
      data
    },
    init
  );
}

function rateLimitHeaders(limitResult: {
  limit: number;
  remaining: number;
  resetAtMs: number;
}): HeadersInit {
  return {
    "X-RateLimit-Limit": String(limitResult.limit),
    "X-RateLimit-Remaining": String(limitResult.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limitResult.resetAtMs / 1000))
  };
}

function mapResumeErrorStatus(code: ResumeExtractionError["code"]): number {
  switch (code) {
    case "FILE_MISSING":
    case "FILE_TOO_LARGE":
    case "FILE_EMPTY":
    case "UNSUPPORTED_TYPE":
    case "PARSE_FAILED":
      return 400;
    case "TEXT_TOO_SHORT":
    case "NO_SUGGESTIONS":
      return 422;
    case "LLM_UNAVAILABLE":
    case "OCR_UNAVAILABLE":
      return 503;
    default:
      return 500;
  }
}

type ResumeSuggestionEnvelope = {
  actor: { id: string; role: "AGENT" };
  suggestion: ResumeSuggestions;
  pipeline: ResumePipelineMeta;
};

async function getFileHash(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getBioTextHash(bioText: string): string {
  return crypto.createHash("sha256").update(bioText).digest("hex");
}

function getOptionalString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function setResumeSuggestionsCookie(
  response: NextResponse,
  suggestion: ResumeSuggestions
): void {
  response.cookies.set({
    name: RESUME_SUGGESTIONS_COOKIE_NAME,
    value: encodeResumeSuggestionsCookie(suggestion),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS
  });
}

function clearResumeSuggestionsCookie(response: NextResponse): void {
  response.cookies.set({
    name: RESUME_SUGGESTIONS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

function requireAgentSession(
  session: AuthSession | null
): { ok: true; userId: string } | { ok: false; response: Response } {
  if (!session?.user) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHENTICATED", "Authentication required.")
    };
  }

  if (session.user.role !== "AGENT") {
    return {
      ok: false,
      response: jsonError(
        403,
        "FORBIDDEN_ROLE",
        "Only estate agents can upload resumes."
      )
    };
  }

  assertCan(session.user.role, "agent:profile:onboard");

  return {
    ok: true,
    userId: session.user.id
  };
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const sessionResult = requireAgentSession(session);

  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  const flags = getResumeFeatureFlags();
  const clientIp = clientIpFromRequestHeaders(request.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "agent:onboarding:resume-upload",
    actorId: sessionResult.userId,
    clientIp,
    config: {
      limit: flags.resumeUploadLimitPerHour,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Too many resume upload attempts. Please retry later.",
      { retryAfterSeconds: rateLimitResult.retryAfterSeconds },
      {
        ...rateLimitHeaders(rateLimitResult),
        "Retry-After": String(rateLimitResult.retryAfterSeconds)
      }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "Upload request must be multipart/form-data.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }

  const resumeFile = formData.get("resumeFile");
  const bioText = getOptionalString(formData.get("bioText"));
  const linkedinUrl = getOptionalString(formData.get("linkedinUrl"));
  const uploadFile = isFileLike(resumeFile) ? resumeFile : null;

  if (!uploadFile && bioText.length === 0) {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "resumeFile or bioText is required.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }

  const rawMode = formData.get("mode");
  const parsedMode = modeSchema.safeParse(
    rawMode === null ? undefined : rawMode
  );

  if (!parsedMode.success && rawMode !== null) {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "mode must be one of heuristic, hybrid, or llm_only.",
      parsedMode.error.flatten(),
      rateLimitHeaders(rateLimitResult)
    );
  }

  try {
    const fileHash = uploadFile ? await getFileHash(uploadFile) : null;
    const bioHash = bioText.length > 0 ? getBioTextHash(bioText) : null;

    const idempotent = await executeIdempotentRequest<ResumeSuggestionEnvelope>(
      {
        actorId: sessionResult.userId,
        route: "/api/agent/onboarding/resume-suggestions",
        idempotencyKey: request.headers.get("idempotency-key"),
        requestHash: createRequestHash({
          inputType: fileHash ? "file" : "bioText",
          fileName: fileHash && uploadFile ? uploadFile.name : undefined,
          fileSize: fileHash && uploadFile ? uploadFile.size : undefined,
          fileType: fileHash && uploadFile ? uploadFile.type : undefined,
          fileHash,
          bioHash,
          linkedinUrl,
          mode: parsedMode.success ? parsedMode.data : undefined
        }),
        operation: async () => {
          const extractionInput: Parameters<
            typeof createResumeSuggestionsFromFile
          >[0] = {};

          if (fileHash && uploadFile) {
            extractionInput.file = uploadFile;
          } else {
            extractionInput.bioText = bioText;
          }

          if (linkedinUrl.length > 0) {
            extractionInput.supplementalText = `LinkedIn URL: ${linkedinUrl}`;
          }

          if (parsedMode.success) {
            extractionInput.mode = parsedMode.data;
          }

          const result = await createResumeSuggestionsFromFile(extractionInput);

          return {
            status: 201,
            body: {
              actor: { id: sessionResult.userId, role: "AGENT" as const },
              suggestion: result.suggestion,
              pipeline: result.pipeline
            }
          };
        }
      }
    );

    const response = NextResponse.json(
      {
        ok: true,
        data: {
          ...idempotent.body,
          replayed: idempotent.replayed
        }
      },
      {
        status: idempotent.status,
        headers: {
          ...rateLimitHeaders(rateLimitResult),
          "Idempotency-Replayed": idempotent.replayed ? "true" : "false"
        }
      }
    );

    setResumeSuggestionsCookie(response, idempotent.body.suggestion);
    return response;
  } catch (error) {
    if (error instanceof IdempotencyError) {
      return jsonError(
        getIdempotencyErrorStatus(error.code),
        error.code,
        error.message,
        undefined,
        rateLimitHeaders(rateLimitResult)
      );
    }

    if (error instanceof ResumeExtractionError) {
      return jsonError(
        mapResumeErrorStatus(error.code),
        error.code,
        error.message,
        error.details,
        rateLimitHeaders(rateLimitResult)
      );
    }

    console.error("Resume suggestion extraction failed unexpectedly", error);
    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Unexpected server error.",
      undefined,
      rateLimitHeaders(rateLimitResult)
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  const sessionResult = requireAgentSession(session);

  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  const suggestion = decodeResumeSuggestionsCookie(
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${RESUME_SUGGESTIONS_COOKIE_NAME}=`))
      ?.slice(RESUME_SUGGESTIONS_COOKIE_NAME.length + 1)
  );

  return jsonSuccess(200, {
    actor: { id: sessionResult.userId, role: "AGENT" as const },
    suggestion
  });
}

export async function DELETE(): Promise<Response> {
  const session = await auth();
  const sessionResult = requireAgentSession(session);

  if (!sessionResult.ok) {
    return sessionResult.response;
  }

  const response = NextResponse.json(
    {
      ok: true,
      data: {
        actor: { id: sessionResult.userId, role: "AGENT" as const },
        cleared: true
      }
    },
    { status: 200 }
  );

  clearResumeSuggestionsCookie(response);
  return response;
}
