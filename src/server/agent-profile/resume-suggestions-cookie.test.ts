import crypto from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  decodeResumeSuggestionsCookie,
  encodeResumeSuggestionsCookie,
  RESUME_SUGGESTIONS_COOKIE_MAX_VALUE_BYTES
} from "@/server/agent-profile/resume-suggestions-cookie";

const envBackup = {
  AUTH_SECRET: process.env.AUTH_SECRET
};

const SECRET = "cookie-test-secret";

function signPayload(payload: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
}

function encodeLegacyCookie(payload: unknown): string {
  const serializedPayload = JSON.stringify(payload);
  const signature = signPayload(serializedPayload);
  const encodedPayload = Buffer.from(serializedPayload, "utf8").toString(
    "base64url"
  );
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
        professional_summary:
          "Concise public summary in British English with enough detail for the profile.",
        longer_bio:
          "Concise public summary in British English with enough detail for the profile.",
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
        recommended_next_steps: [
          "Publish the profile when you're happy with the draft"
        ]
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

  it("compacts large v3 payloads so they stay within browser cookie limits", () => {
    process.env.AUTH_SECRET = SECRET;

    const longText =
      "A trusted estate agent with detailed market knowledge, clear seller communication, and repeatable launch process. ".repeat(
        24
      );

    const cookieValue = encodeResumeSuggestionsCookie({
      version: 3,
      suggestionId: "resume_cookie_large",
      sourceFileName: "large-resume.txt",
      sourceMimeType: "text/plain",
      extractedAtIso: new Date().toISOString(),
      extractedTextLength: 48000,
      summary: longText.slice(0, 400),
      highlights: Array.from(
        { length: 8 },
        (_, index) =>
          `Strong profile highlight ${index + 1} with detailed wording`
      ),
      profile: {
        full_name: "Large Cookie Agent",
        preferred_display_name: "Large Cookie Agent",
        email: "large-cookie@example.com",
        phone: "+44 20 7946 0999",
        agency: "Large Cookie Estates",
        job_title: "Senior Partner",
        years_experience: 18,
        service_areas: Array.from(
          { length: 12 },
          (_, index) => `SW${index + 1}`
        ),
        specialties: Array.from(
          { length: 12 },
          (_, index) => `Prime sales specialty ${index + 1}`
        ),
        credentials: Array.from(
          { length: 12 },
          (_, index) => `Credential ${index + 1}`
        ),
        languages: ["English", "French", "Spanish"],
        professional_summary: longText.slice(0, 400),
        longer_bio: longText.slice(0, 3000),
        notable_experience: Array.from(
          { length: 12 },
          (_, index) =>
            `Notable transaction and client advisory result ${index + 1}`
        ),
        education: Array.from(
          { length: 12 },
          (_, index) => `Education ${index + 1}`
        ),
        awards_or_memberships: Array.from(
          { length: 12 },
          (_, index) => `Award or membership ${index + 1}`
        ),
        social_links: {
          linkedin: "https://www.linkedin.com/in/large-cookie-agent",
          website: "https://example.com/large-cookie-agent",
          instagram: "https://instagram.com/largecookieagent"
        },
        headshot_present: false,
        source_documents: [{ document_id: "doc_large_cookie", type: "resume" }],
        confidence: {
          full_name: 0.97,
          preferred_display_name: 0.97,
          email: 0.96,
          phone: 0.9,
          agency: 0.95,
          job_title: 0.94,
          years_experience: 0.92,
          service_areas: 0.9,
          specialties: 0.9,
          credentials: 0.85,
          languages: 0.85,
          professional_summary: 0.9,
          longer_bio: 0.9,
          notable_experience: 0.8,
          education: 0.8,
          awards_or_memberships: 0.8,
          social_links: 0.7,
          headshot_present: 0
        },
        missing_fields: [],
        needs_confirmation: Array.from({ length: 12 }, (_, index) => ({
          field: `field_${index + 1}`,
          reason: `Review extracted detail ${index + 1} before publishing the public profile.`
        })),
        publish_readiness_score: 91,
        recommended_next_steps: Array.from(
          { length: 12 },
          (_, index) => `Recommended next step ${index + 1}`
        )
      },
      prefill: {
        fullName: "Large Cookie Agent",
        workEmail: "large-cookie@example.com",
        phone: "+44 20 7946 0999",
        agencyName: "Large Cookie Estates",
        jobTitle: "Senior Partner",
        yearsExperience: 18,
        bio: longText.slice(0, 3000),
        serviceAreas: Array.from(
          { length: 12 },
          (_, index) => `SW${index + 1}`
        ),
        specialties: Array.from(
          { length: 12 },
          (_, index) => `Prime sales specialty ${index + 1}`
        )
      },
      confidence: {
        fullName: 0.97,
        workEmail: 0.96,
        phone: 0.9,
        agencyName: 0.95,
        jobTitle: 0.94,
        yearsExperience: 0.92,
        serviceAreas: 0.9,
        specialties: 0.9,
        bio: 0.9
      },
      evidence: {
        fullName: longText.slice(0, 280),
        workEmail: "large-cookie@example.com",
        phone: "+44 20 7946 0999",
        agencyName: longText.slice(0, 280),
        jobTitle: longText.slice(0, 280),
        yearsExperience: longText.slice(0, 280),
        bio: longText.slice(0, 280),
        serviceAreas: longText.slice(0, 280),
        specialties: longText.slice(0, 280)
      },
      warnings: Array.from(
        { length: 12 },
        (_, index) =>
          `Warning ${index + 1}: review this extracted profile detail.`
      )
    });

    expect(Buffer.byteLength(cookieValue, "utf8")).toBeLessThanOrEqual(
      RESUME_SUGGESTIONS_COOKIE_MAX_VALUE_BYTES
    );
    expect(decodeResumeSuggestionsCookie(cookieValue)?.profile.full_name).toBe(
      "Large Cookie Agent"
    );
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
