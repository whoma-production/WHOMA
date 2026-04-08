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
    resumePrefillMode: "llm_only",
    enableResumeOcrFallback: false,
    resumeLlmProvider: "openai",
    resumeLlmModel: "gpt-5.4",
    resumeCleanupModel: "gpt-5.4-mini",
    resumeLlmTimeoutMs: 8000,
    resumeMinConfidence: 0.7,
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
        version: 3,
        suggestionId: "resume_12345678",
        sourceFileName: "resume.txt",
        sourceMimeType: "text/plain",
        extractedAtIso: new Date().toISOString(),
        extractedTextLength: 300,
        summary: "summary",
        highlights: ["highlight"],
        profile: {
          full_name: "Jane Agent",
          preferred_display_name: "Jane",
          email: "jane@example.com",
          phone: "+44 20 7946 1234",
          agency: "Example Estates",
          job_title: "Senior Sales Negotiator",
          years_experience: 8,
          service_areas: ["SW1A", "SE1"],
          specialties: ["Valuations"],
          credentials: [],
          languages: ["English"],
          professional_summary: "Concise public summary in British English with enough detail for the profile.",
          longer_bio: "Concise public summary in British English with enough detail for the profile.",
          notable_experience: [],
          education: [],
          awards_or_memberships: [],
          social_links: {
            linkedin: null,
            website: null,
            instagram: null
          },
          headshot_present: false,
          source_documents: [{ document_id: "doc_123", type: "resume" }],
          confidence: {
            full_name: 0.98,
            preferred_display_name: 0.9,
            email: 0.98,
            phone: 0.92,
            agency: 0.96,
            job_title: 0.93,
            years_experience: 0.91,
            service_areas: 0.95,
            specialties: 0.94,
            credentials: 0,
            languages: 0.8,
            professional_summary: 0.95,
            longer_bio: 0.93,
            notable_experience: 0,
            education: 0,
            awards_or_memberships: 0,
            social_links: 0,
            headshot_present: 0
          },
          missing_fields: [],
          needs_confirmation: [],
          publish_readiness_score: 83,
          recommended_next_steps: ["Upload a headshot"]
        },
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
    expect(body.data.suggestion.version).toBe(3);
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
      version: 3,
      suggestionId: "resume_cookie_1",
      sourceFileName: "resume.txt",
      sourceMimeType: "text/plain",
      extractedAtIso: new Date().toISOString(),
      extractedTextLength: 240,
      summary: "summary",
      highlights: ["highlight"],
      profile: {
        full_name: "Cookie Agent",
        preferred_display_name: "Cookie",
        email: "cookie@example.com",
        phone: null,
        agency: "Cookie Estates",
        job_title: "Director",
        years_experience: 12,
        service_areas: ["SW1A"],
        specialties: ["Sales"],
        credentials: [],
        languages: [],
        professional_summary: "Concise public summary in British English with enough detail for the profile.",
        longer_bio: "Concise public summary in British English with enough detail for the profile.",
        notable_experience: [],
        education: [],
        awards_or_memberships: [],
        social_links: {
          linkedin: null,
          website: null,
          instagram: null
        },
        headshot_present: false,
        source_documents: [{ document_id: "doc_cookie", type: "resume" }],
        confidence: {
          full_name: 0.97,
          preferred_display_name: 0.9,
          email: 0.96,
          phone: 0,
          agency: 0.95,
          job_title: 0.94,
          years_experience: 0.92,
          service_areas: 0.95,
          specialties: 0.95,
          credentials: 0,
          languages: 0,
          professional_summary: 0.95,
          longer_bio: 0.95,
          notable_experience: 0,
          education: 0,
          awards_or_memberships: 0,
          social_links: 0,
          headshot_present: 0
        },
        missing_fields: [],
        needs_confirmation: [],
        publish_readiness_score: 88,
        recommended_next_steps: ["Publish the profile when you're happy with the draft"]
      },
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

  it("POST accepts pasted bio text", async () => {
    createResumeSuggestionsFromFileMock.mockResolvedValue({
      suggestion: {
        version: 3,
        suggestionId: "resume_bio_1",
        sourceFileName: "pasted-bio.txt",
        sourceMimeType: "text/plain",
        extractedAtIso: new Date().toISOString(),
        extractedTextLength: 180,
        summary: "summary",
        highlights: ["highlight"],
        profile: {
          full_name: "Bio Agent",
          preferred_display_name: "Bio",
          email: "bio@example.com",
          phone: null,
          agency: "Bio Estates",
          job_title: "Agent",
          years_experience: 5,
          service_areas: ["SE1"],
          specialties: ["Valuations"],
          credentials: [],
          languages: [],
          professional_summary: "Concise public summary in British English with enough detail for the profile.",
          longer_bio: "Concise public summary in British English with enough detail for the profile.",
          notable_experience: [],
          education: [],
          awards_or_memberships: [],
          social_links: {
            linkedin: null,
            website: null,
            instagram: null
          },
          headshot_present: false,
          source_documents: [{ document_id: "doc_bio", type: "bio" }],
          confidence: {
            full_name: 0.97,
            preferred_display_name: 0.9,
            email: 0.96,
            phone: 0,
            agency: 0.95,
            job_title: 0.94,
            years_experience: 0.92,
            service_areas: 0.95,
            specialties: 0.95,
            credentials: 0,
            languages: 0,
            professional_summary: 0.95,
            longer_bio: 0.95,
            notable_experience: 0,
            education: 0,
            awards_or_memberships: 0,
            social_links: 0,
            headshot_present: 0
          },
          missing_fields: [],
          needs_confirmation: [],
          publish_readiness_score: 88,
          recommended_next_steps: ["Publish the profile when you're happy with the draft"]
        },
        prefill: { fullName: "Bio Agent" },
        confidence: { fullName: 0.9 },
        evidence: { fullName: "Bio Agent" },
        warnings: []
      },
      pipeline: {
        mode: "llm_only",
        ocrUsed: false,
        llmUsed: true,
        durationMs: 120
      }
    });

    executeIdempotentRequestMock.mockImplementation(async ({ operation }: { operation: () => Promise<{ status: number; body: unknown }> }) => {
      const op = await operation();
      return { ...op, replayed: false };
    });

    const formData = {
      get: (key: string): FormDataEntryValue | null => {
        if (key === "bioText") {
          return "Bio Agent is a property professional.";
        }

        return null;
      }
    } as unknown as FormData;

    const response = await POST({
      headers: new Headers({
        "idempotency-key": "bio-upload-1234"
      }),
      formData: async () => formData
    } as unknown as Request);

    expect(response.status).toBe(201);
    expect(createResumeSuggestionsFromFileMock).toHaveBeenCalledWith({
      bioText: "Bio Agent is a property professional."
    });
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
