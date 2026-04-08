import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildResumeExtractionPrompt,
  createResumeSuggestionsFromFile,
  parseResumeLlmExtractionResult
} from "@/server/agent-profile/resume-ai";
import { ResumeExtractionError } from "@/server/agent-profile/resume-intake";

const envBackup = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  ENABLE_RESUME_AI_PREFILL: process.env.ENABLE_RESUME_AI_PREFILL,
  ENABLE_RESUME_OCR_FALLBACK: process.env.ENABLE_RESUME_OCR_FALLBACK,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  RESUME_CLEANUP_MODEL: process.env.RESUME_CLEANUP_MODEL,
  RESUME_LLM_MODEL: process.env.RESUME_LLM_MODEL,
  RESUME_PREFILL_MODE: process.env.RESUME_PREFILL_MODE
};

afterEach(() => {
  process.env.AUTH_SECRET = envBackup.AUTH_SECRET;
  process.env.ENABLE_RESUME_AI_PREFILL = envBackup.ENABLE_RESUME_AI_PREFILL;
  process.env.ENABLE_RESUME_OCR_FALLBACK = envBackup.ENABLE_RESUME_OCR_FALLBACK;
  process.env.OPENAI_API_KEY = envBackup.OPENAI_API_KEY;
  process.env.RESUME_CLEANUP_MODEL = envBackup.RESUME_CLEANUP_MODEL;
  process.env.RESUME_LLM_MODEL = envBackup.RESUME_LLM_MODEL;
  process.env.RESUME_PREFILL_MODE = envBackup.RESUME_PREFILL_MODE;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function createMockFile(contents: string, name = "resume.txt"): File {
  const encoded = new TextEncoder().encode(contents);
  return {
    name,
    type: "text/plain",
    size: encoded.byteLength,
    arrayBuffer: async () => encoded.buffer
  } as unknown as File;
}

describe("resume ai extraction", () => {
  it("builds the structured prompt bundle", () => {
    const prompt = buildResumeExtractionPrompt({
      sourceText: "John Doe\\nSenior Sales Negotiator",
      sourceDocument: {
        document_id: "doc_123",
        type: "resume"
      },
      existingProfile: {
        agencyName: "Example Estates"
      }
    });

    expect(prompt.systemPrompt).toContain("WHOMA Profile Extractor");
    expect(prompt.systemPrompt).toContain("British English");
    expect(prompt.userPrompt).toContain("Source document");
    expect(prompt.userPrompt).toContain("doc_123");
    expect(prompt.userPrompt).toContain("Example Estates");
  });

  it("parses structured profile JSON", () => {
    const parsed = parseResumeLlmExtractionResult(`{
      "full_name": "Jane Agent",
      "preferred_display_name": "Jane",
      "email": "jane@example.com",
      "phone": "+44 20 7946 1234",
      "agency": "Example Estates",
      "job_title": "Senior Sales Negotiator",
      "years_experience": 8,
      "service_areas": ["SW1A", "SE1"],
      "specialties": ["First-time buyers"],
      "credentials": ["NAEA"],
      "languages": ["English"],
      "professional_summary": "Concise public summary for the profile.",
      "longer_bio": "Concise public summary for the profile.",
      "notable_experience": ["Closed high-value sales in central London."],
      "education": ["Guildford College"],
      "awards_or_memberships": ["Member of the NAEA"],
      "social_links": {
        "linkedin": "https://linkedin.com/in/jane-agent",
        "website": null,
        "instagram": null
      },
      "headshot_present": false,
      "source_documents": [{ "document_id": "doc_123", "type": "resume" }],
      "confidence": {
        "full_name": 0.98,
        "preferred_display_name": 0.9,
        "email": 0.98,
        "phone": 0.92,
        "agency": 0.96,
        "job_title": 0.93,
        "years_experience": 0.91,
        "service_areas": 0.95,
        "specialties": 0.94,
        "credentials": 0.81,
        "languages": 0.8,
        "professional_summary": 0.95,
        "longer_bio": 0.93,
        "notable_experience": 0.88,
        "education": 0.85,
        "awards_or_memberships": 0.8,
        "social_links": 0.75,
        "headshot_present": 0.7
      },
      "missing_fields": ["phone"],
      "needs_confirmation": [{ "field": "headshot_present", "reason": "Confirm the headshot." }],
      "publish_readiness_score": 83,
      "recommended_next_steps": ["Upload a headshot"]
    }`);

    expect(parsed.full_name).toBe("Jane Agent");
    expect(parsed.source_documents[0]?.document_id).toBe("doc_123");
    expect(parsed.publish_readiness_score).toBe(83);
  });

  it("rejects invalid model output payloads", () => {
    expect(() => parseResumeLlmExtractionResult("no-json")).toThrow(
      ResumeExtractionError
    );
  });

  it("returns deterministic heuristic suggestions in heuristic mode", async () => {
    process.env.ENABLE_RESUME_AI_PREFILL = "false";
    process.env.ENABLE_RESUME_OCR_FALLBACK = "false";

    const resumeText =
      "Jane Seller\\nSenior Sales Negotiator\\nAcme Estates\\nEmail: jane@acme-estates.co.uk\\nPhone: +44 20 7946 1234\\nI help homeowners sell quickly with clear communication.\\nService areas: SW1A, SE1\\nSpecialties: first-time buyers, valuations";
    const file = createMockFile(resumeText);

    const result = await createResumeSuggestionsFromFile({
      file,
      mode: "heuristic"
    });

    expect(result.pipeline.mode).toBe("heuristic");
    expect(result.suggestion.version).toBe(3);
    expect(result.suggestion.prefill.workEmail).toBe("jane@acme-estates.co.uk");
    expect(result.suggestion.profile.source_documents[0]?.type).toBe("resume");
  });

  it("uses the primary OpenAI structured extraction flow", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ENABLE_RESUME_AI_PREFILL = "true";
    process.env.ENABLE_RESUME_OCR_FALLBACK = "false";
    process.env.RESUME_PREFILL_MODE = "llm_only";
    process.env.RESUME_LLM_MODEL = "gpt-5.4";
    process.env.RESUME_CLEANUP_MODEL = "gpt-5.4-mini";

    const profile = {
      full_name: "Jane Agent",
      preferred_display_name: "Jane",
      email: "jane@example.com",
      phone: "+44 20 7946 1234",
      agency: "Example Estates",
      job_title: "Senior Sales Negotiator",
      years_experience: 8,
      service_areas: ["SW1A", "SE1"],
      specialties: ["First-time buyers", "Valuations"],
      credentials: ["NAEA"],
      languages: ["English"],
      professional_summary: "Polished public summary in concise British English.",
      longer_bio: "Polished public summary in concise British English.",
      notable_experience: ["Closed high-value sales in central London."],
      education: ["Guildford College"],
      awards_or_memberships: ["Member of the NAEA"],
      social_links: {
        linkedin: "https://linkedin.com/in/jane-agent",
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
        credentials: 0.81,
        languages: 0.8,
        professional_summary: 0.95,
        longer_bio: 0.93,
        notable_experience: 0.88,
        education: 0.85,
        awards_or_memberships: 0.8,
        social_links: 0.75,
        headshot_present: 0.7
      },
      missing_fields: [],
      needs_confirmation: [],
      publish_readiness_score: 83,
      recommended_next_steps: ["Upload a headshot"]
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_text: JSON.stringify(profile)
        })
      })
    );

    const file = createMockFile(
      "Jane Agent\\nSenior Sales Negotiator\\nExample Estates\\nI help homeowners sell with confidence across central London and surrounding boroughs. I specialise in valuations, pricing strategy and clear vendor communication."
    );

    const result = await createResumeSuggestionsFromFile({
      file,
      mode: "llm_only"
    });

    expect(result.pipeline.llmUsed).toBe(true);
    expect(result.suggestion.version).toBe(3);
    expect(result.suggestion.profile.full_name).toBe("Jane Agent");
    expect(result.suggestion.profile.source_documents[0]?.document_id).toBe("doc_123");
    expect(result.suggestion.prefill.workEmail).toBe("jane@example.com");
    expect(result.suggestion.summary).toContain("Polished public summary");
  });
});
