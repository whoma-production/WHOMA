import crypto from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  decodeResumeSuggestionsCookie,
  encodeResumeSuggestionsCookie
} from "@/server/agent-profile/resume-suggestions-cookie";

const envBackup = {
  AUTH_SECRET: process.env.AUTH_SECRET
};

const SECRET = "cookie-test-secret";

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encodeLegacyCookie(payload: unknown): string {
  const serializedPayload = JSON.stringify(payload);
  const signature = signPayload(serializedPayload);
  const encodedPayload = Buffer.from(serializedPayload, "utf8").toString("base64url");
  return `${signature}.${encodedPayload}`;
}

afterEach(() => {
  process.env.AUTH_SECRET = envBackup.AUTH_SECRET;
});

describe("resume suggestions cookie", () => {
  it("round-trips the v3 payload", () => {
    process.env.AUTH_SECRET = SECRET;

    const cookieValue = encodeResumeSuggestionsCookie({
      version: 3,
      suggestionId: "resume_cookie_v3",
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

    const decoded = decodeResumeSuggestionsCookie(cookieValue);
    expect(decoded?.version).toBe(3);
    expect(decoded?.profile.full_name).toBe("Cookie Agent");
    expect(decoded?.prefill.fullName).toBe("Cookie Agent");
  });

  it("upgrades legacy v1 payloads to v3", () => {
    process.env.AUTH_SECRET = SECRET;

    const cookieValue = encodeLegacyCookie({
      version: 1,
      sourceFileName: "resume.txt",
      sourceMimeType: "text/plain",
      extractedAtIso: new Date().toISOString(),
      extractedTextLength: 240,
      summary: "summary",
      highlights: ["highlight"],
      prefill: { fullName: "Legacy Agent", workEmail: "legacy@example.com" }
    });

    const decoded = decodeResumeSuggestionsCookie(cookieValue);
    expect(decoded?.version).toBe(3);
    expect(decoded?.profile.full_name).toBe("Legacy Agent");
    expect(decoded?.prefill.workEmail).toBe("legacy@example.com");
  });

  it("upgrades legacy v2 payloads to v3", () => {
    process.env.AUTH_SECRET = SECRET;

    const cookieValue = encodeLegacyCookie({
      version: 2,
      suggestionId: "legacy_123",
      sourceFileName: "resume.txt",
      sourceMimeType: "text/plain",
      extractedAtIso: new Date().toISOString(),
      extractedTextLength: 240,
      summary: "summary",
      highlights: ["highlight"],
      prefill: { fullName: "Legacy Two", workEmail: "legacy2@example.com" },
      confidence: { fullName: 0.9, workEmail: 0.95 },
      evidence: { fullName: "Legacy Two" },
      warnings: []
    });

    const decoded = decodeResumeSuggestionsCookie(cookieValue);
    expect(decoded?.version).toBe(3);
    expect(decoded?.profile.full_name).toBe("Legacy Two");
    expect(decoded?.profile.source_documents[0]?.type).toBe("resume");
  });
});
