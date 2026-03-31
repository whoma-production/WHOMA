import { beforeEach, describe, expect, it, vi } from "vitest";

import { encodeResumeSuggestionsCookie } from "@/server/agent-profile/resume-suggestions-cookie";

const {
  authMock,
  assertCanMock,
  checkRateLimitMock,
  executeIdempotentRequestMock,
  createResumeSuggestionsFromFileMock,
  createRequestHashMock,
  getIdempotencyErrorStatusMock,
  MockIdempotencyError
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  assertCanMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  executeIdempotentRequestMock: vi.fn(),
  createResumeSuggestionsFromFileMock: vi.fn(),
  createRequestHashMock: vi.fn((value: unknown) => JSON.stringify(value)),
  getIdempotencyErrorStatusMock: vi.fn(() => 409),
  MockIdempotencyError: class MockIdempotencyError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
}));

vi.mock("@/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/auth/rbac", () => ({
  assertCan: assertCanMock
}));

vi.mock("@/server/http/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  clientIpFromRequestHeaders: () => "127.0.0.1"
}));

vi.mock("@/server/http/idempotency", () => ({
  createRequestHash: createRequestHashMock,
  executeIdempotentRequest: executeIdempotentRequestMock,
  getIdempotencyErrorStatus: getIdempotencyErrorStatusMock,
  IdempotencyError: MockIdempotencyError
}));

vi.mock("@/server/agent-profile/resume-ai", () => ({
  createResumeSuggestionsFromFile: createResumeSuggestionsFromFileMock
}));

vi.mock("@/server/agent-profile/resume-flags", () => ({
  getResumeFeatureFlags: () => ({
    enableResumeAiPrefill: true,
    resumePrefillMode: "hybrid",
    enableResumeOcrFallback: true,
    resumeLlmProvider: "openai",
    resumeLlmModel: "gpt-5.4-mini",
    resumeLlmTimeoutMs: 8000,
    resumeMinConfidence: 0.72,
    resumeAiShadowMode: false,
    resumeUploadLimitPerHour: 6,
    resumeMaxFileMb: 4
  })
}));

import { DELETE, GET, POST } from "@/app/api/agent/onboarding/resume-suggestions/route";
import { IdempotencyError } from "@/server/http/idempotency";

function createMockFile(contents: string): File {
  const encoded = new TextEncoder().encode(contents);
  return {
    name: "resume.txt",
    type: "text/plain",
    size: encoded.byteLength,
    arrayBuffer: async () => encoded.buffer
  } as unknown as File;
}

beforeEach(() => {
  authMock.mockReset();
  assertCanMock.mockReset();
  checkRateLimitMock.mockReset();
  executeIdempotentRequestMock.mockReset();
  createResumeSuggestionsFromFileMock.mockReset();
  createRequestHashMock.mockClear();
  getIdempotencyErrorStatusMock.mockClear();

  authMock.mockResolvedValue({
    user: {
      id: "agent_1",
      role: "AGENT"
    }
  });

  checkRateLimitMock.mockResolvedValue({
    ok: true,
    limit: 6,
    remaining: 5,
    retryAfterSeconds: 0,
    resetAtMs: Date.now() + 60_000
  });
});

describe("/api/agent/onboarding/resume-suggestions", () => {
  it("POST returns suggestion envelope and sets signed cookie", async () => {
    createResumeSuggestionsFromFileMock.mockResolvedValue({
      suggestion: {
        version: 2,
        suggestionId: "resume_12345678",
        sourceFileName: "resume.txt",
        sourceMimeType: "text/plain",
        extractedAtIso: new Date().toISOString(),
        extractedTextLength: 300,
        summary: "summary",
        highlights: ["highlight"],
        prefill: { fullName: "Jane Agent" },
        confidence: { fullName: 0.9 },
        evidence: { fullName: "Jane Agent" },
        warnings: []
      },
      pipeline: {
        mode: "hybrid",
        ocrUsed: false,
        llmUsed: true,
        durationMs: 120
      }
    });

    executeIdempotentRequestMock.mockImplementation(async ({ operation }: { operation: () => Promise<{ status: number; body: unknown }> }) => {
      const op = await operation();
      return { ...op, replayed: false };
    });

    const resumeFile = createMockFile("Jane Agent CV");
    const formData = {
      get: (key: string): FormDataEntryValue | null => {
        if (key === "resumeFile") {
          return resumeFile;
        }

        if (key === "mode") {
          return "hybrid";
        }

        return null;
      }
    } as unknown as FormData;

    const response = await POST({
      headers: new Headers({
        "idempotency-key": "resume-upload-1234"
      }),
      formData: async () => formData
    } as unknown as Request);

    expect(response.status).toBe(201);
    expect(response.headers.get("Idempotency-Replayed")).toBe("false");
    expect(response.headers.get("set-cookie")).toContain(
      "whoma_agent_resume_suggestions="
    );

    const body = (await response.json()) as {
      ok: boolean;
      data: { suggestion: { version: number }; replayed: boolean };
    };

    expect(body.ok).toBe(true);
    expect(body.data.suggestion.version).toBe(2);
    expect(body.data.replayed).toBe(false);
  });

  it("POST maps idempotency errors", async () => {
    executeIdempotentRequestMock.mockRejectedValue(
      new IdempotencyError(
        "MISSING_IDEMPOTENCY_KEY",
        "Idempotency-Key header is required for this endpoint."
      )
    );

    const resumeFile = createMockFile("Jane Agent CV");
    const formData = {
      get: (key: string): FormDataEntryValue | null =>
        key === "resumeFile" ? resumeFile : null
    } as unknown as FormData;

    const response = await POST({
      headers: new Headers(),
      formData: async () => formData
    } as unknown as Request);

    expect(response.status).toBe(409);
    const body = (await response.json()) as { ok: boolean; error: { code: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("MISSING_IDEMPOTENCY_KEY");
  });

  it("GET returns cookie-backed suggestion", async () => {
    const cookieValue = encodeResumeSuggestionsCookie({
      version: 2,
      suggestionId: "resume_cookie_1",
      sourceFileName: "resume.txt",
      sourceMimeType: "text/plain",
      extractedAtIso: new Date().toISOString(),
      extractedTextLength: 240,
      summary: "summary",
      highlights: ["highlight"],
      prefill: { fullName: "Cookie Agent" },
      confidence: {},
      evidence: {},
      warnings: []
    });

    const response = await GET(
      new Request("http://localhost/api/agent/onboarding/resume-suggestions", {
        headers: {
          cookie: `whoma_agent_resume_suggestions=${cookieValue}`
        }
      })
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      data: { suggestion: { prefill?: { fullName?: string } } | null };
    };
    expect(body.ok).toBe(true);
    expect(body.data.suggestion?.prefill?.fullName).toBe("Cookie Agent");
  });

  it("DELETE clears the suggestion cookie", async () => {
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "whoma_agent_resume_suggestions="
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
