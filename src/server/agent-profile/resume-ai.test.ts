import { afterEach, describe, expect, it } from "vitest";

import {
  buildResumeExtractionPrompt,
  createResumeSuggestionsFromFile,
  parseResumeLlmExtractionResult
} from "@/server/agent-profile/resume-ai";
import { ResumeExtractionError } from "@/server/agent-profile/resume-intake";

const envBackup = {
  ENABLE_RESUME_AI_PREFILL: process.env.ENABLE_RESUME_AI_PREFILL,
  ENABLE_RESUME_OCR_FALLBACK: process.env.ENABLE_RESUME_OCR_FALLBACK
};

afterEach(() => {
  process.env.ENABLE_RESUME_AI_PREFILL = envBackup.ENABLE_RESUME_AI_PREFILL;
  process.env.ENABLE_RESUME_OCR_FALLBACK = envBackup.ENABLE_RESUME_OCR_FALLBACK;
});

describe("resume ai extraction", () => {
  it("builds the structured prompt bundle", () => {
    const prompt = buildResumeExtractionPrompt({
      resumeText: "John Doe\\nSenior Sales Negotiator",
      existingProfile: {
        agencyName: "Example Estates"
      }
    });

    expect(prompt.systemPrompt).toContain("Return strict JSON only");
    expect(prompt.userPrompt).toContain("Current known values");
    expect(prompt.userPrompt).toContain("Example Estates");
  });

  it("parses JSON wrapped in markdown fences", () => {
    const parsed = parseResumeLlmExtractionResult(`\n\`\`\`json\n{\n  \"summary\": \"Test\",\n  \"highlights\": [\"Signal\"],\n  \"fields\": {\n    \"fullName\": {\"value\": \"Jane Agent\", \"confidence\": 0.88, \"evidence\": \"Jane Agent\"}\n  },\n  \"warnings\": []\n}\n\`\`\``);

    expect(parsed.summary).toBe("Test");
    expect(parsed.fields?.fullName?.value).toBe("Jane Agent");
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
    const encoded = new TextEncoder().encode(resumeText);
    const file = {
      name: "resume.txt",
      type: "text/plain",
      size: encoded.byteLength,
      arrayBuffer: async () => encoded.buffer
    } as unknown as File;

    const result = await createResumeSuggestionsFromFile({
      file,
      mode: "heuristic"
    });

    expect(result.pipeline.mode).toBe("heuristic");
    expect(result.suggestion.version).toBe(2);
    expect(result.suggestion.prefill.workEmail).toBe("jane@acme-estates.co.uk");
    expect(result.suggestion.prefill.serviceAreas?.length).toBeGreaterThan(0);
  });
});
