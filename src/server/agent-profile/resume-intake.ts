import crypto from "node:crypto";
import { inflateRawSync, inflateSync } from "node:zlib";

import { isAcceptedWorkEmail } from "@/lib/validation/agent-profile";
import { getResumeFeatureFlags } from "@/server/agent-profile/resume-flags";

import type {
  ResumePrefillValues,
  ResumeSuggestions
} from "@/server/agent-profile/resume-suggestions-cookie";

const DEFAULT_RESUME_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const MIN_USABLE_TEXT_LENGTH = 120;
const MAX_EXTRACTED_TEXT_LENGTH = 25_000;

const SUPPORTED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/rtf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
  "text/rtf"
]);

const SUPPORTED_RESUME_EXTENSIONS = new Set([".pdf", ".docx", ".md", ".markdown", ".txt", ".rtf"]);

const POSTCODE_DISTRICT_PATTERN = /\b[A-Z]{1,2}\d[A-Z\d]?\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const YEARS_EXPERIENCE_PATTERN = /(\d{1,2})\+?\s+(?:years?|yrs?)(?:\s+experience)?/gi;
const SINCE_YEAR_PATTERN = /\b(?:since|from)\s+(19\d{2}|20\d{2})\b/gi;

const SPECIALTY_MATCHERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /first[-\s]?time buyers?/i, label: "First-time buyers" },
  { pattern: /luxury|prime|high[-\s]?end/i, label: "Luxury homes" },
  { pattern: /investment|investors?/i, label: "Investment sales" },
  { pattern: /new build|new homes?/i, label: "New homes" },
  { pattern: /lettings?|rental/i, label: "Lettings" },
  { pattern: /valuations?|appraisals?/i, label: "Valuations" },
  { pattern: /probate/i, label: "Probate sales" },
  { pattern: /auction/i, label: "Auction sales" },
  { pattern: /relocation|relocations?/i, label: "Relocation support" },
  { pattern: /vendor|seller communication/i, label: "Vendor communication" },
  { pattern: /negotiation|negotiator/i, label: "Negotiation" },
  { pattern: /marketing|campaign/i, label: "Marketing strategy" },
  { pattern: /family homes?/i, label: "Family homes" },
  { pattern: /chain[-\s]?free/i, label: "Chain-free sales" }
];

const JOB_TITLE_MATCHERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /senior sales negotiator/i, label: "Senior Sales Negotiator" },
  { pattern: /sales negotiator/i, label: "Sales Negotiator" },
  { pattern: /associate director/i, label: "Associate Director" },
  { pattern: /branch manager/i, label: "Branch Manager" },
  { pattern: /sales manager/i, label: "Sales Manager" },
  { pattern: /lettings negotiator/i, label: "Lettings Negotiator" },
  { pattern: /estate agent/i, label: "Estate Agent" },
  { pattern: /property consultant/i, label: "Property Consultant" },
  { pattern: /director/i, label: "Director" },
  { pattern: /partner/i, label: "Partner" },
  { pattern: /valuer/i, label: "Valuer" }
];

const AGENCY_MATCHERS: RegExp[] = [
  /(?:at|with|for)\s+([A-Z][A-Za-z0-9&'.-]+(?:\s+[A-Z][A-Za-z0-9&'.-]+){0,6})/i,
  /([A-Z][A-Za-z0-9&'.-]+(?:\s+[A-Z][A-Za-z0-9&'.-]+){0,6}\s+(?:Estates|Estate Agents|Estate|Properties|Property|Homes|Group|Partners|Brokers|Realty|Residential|Agency|Ltd|Limited|LLP))/i
];

const COMMON_SECTION_HEADERS = new Set([
  "about",
  "bio",
  "experience",
  "expertise",
  "profile",
  "professional summary",
  "summary",
  "skills",
  "specialties"
]);

const CONTACT_LINE_MATCHERS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s().-]{6,}\d)/i,
  /linkedin\.com/i,
  /curriculum vitae/i,
  /\bresume\b/i,
  /\bcv\b/i
];

const GENERIC_BIO_KEYWORDS = [
  "clients",
  "homeowners",
  "buyers",
  "sellers",
  "vendors",
  "marketing",
  "sales",
  "negotiation",
  "communication",
  "valuation",
  "property",
  "market"
];

export class ResumeExtractionError extends Error {
  readonly code:
    | "FILE_MISSING"
    | "FILE_TOO_LARGE"
    | "FILE_EMPTY"
    | "UNSUPPORTED_TYPE"
    | "PARSE_FAILED"
    | "TEXT_TOO_SHORT"
    | "NO_SUGGESTIONS"
    | "LLM_UNAVAILABLE"
    | "OCR_UNAVAILABLE";

  readonly details: Record<string, unknown> | undefined;

  constructor(
    code:
      | "FILE_MISSING"
      | "FILE_TOO_LARGE"
      | "FILE_EMPTY"
      | "UNSUPPORTED_TYPE"
      | "PARSE_FAILED"
      | "TEXT_TOO_SHORT"
      | "NO_SUGGESTIONS"
      | "LLM_UNAVAILABLE"
      | "OCR_UNAVAILABLE",
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ResumeExtractionError";
    this.code = code;
    this.details = details;
  }
}

export type ResumeUploadFileMeta = {
  name: string;
  mimeType: string;
  size: number;
  extension: string;
};

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

function cleanCandidateText(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^[\s\-•|]+/, "")
    .replace(/[\s\-•|]+$/, "");
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toTitleish(value: string): string {
  return collapseSpaces(value)
    .split(" ")
    .map((part) => {
      if (!part) {
        return part;
      }

      if (part.length <= 2) {
        return part.toUpperCase();
      }

      const firstCharacter = part.charAt(0);
      return firstCharacter.toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codePoint: string) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)));
}

function decodePdfTextString(value: string): string {
  let result = "";

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      result += char;
      continue;
    }

    const next = value[index + 1];
    if (!next) {
      break;
    }

    if (next === "n") {
      result += "\n";
    } else if (next === "r") {
      result += "\r";
    } else if (next === "t") {
      result += "\t";
    } else if (next === "b") {
      result += "\b";
    } else if (next === "f") {
      result += "\f";
    } else if (next === "(" || next === ")" || next === "\\") {
      result += next;
    } else if (/[0-7]/.test(next)) {
      const octal = value.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
      result += String.fromCharCode(Number.parseInt(octal, 8));
      index += octal.length;
      continue;
    } else {
      result += next;
    }

    index += 1;
  }

  return result;
}

function stripRtfFormatting(value: string): string {
  return normalizeMultilineText(
    value
      .replace(/\\'[0-9a-fA-F]{2}/g, " ")
      .replace(/\\par[d]?/g, "\n")
      .replace(/\\tab/g, "\t")
      .replace(/\\line/g, "\n")
      .replace(/\{\\[^}]+\}/g, " ")
      .replace(/[{}]/g, " ")
      .replace(/\\[a-z]+-?\d* ?/gi, " ")
  );
}

function getResumeExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function isProbablyBinary(buffer: Buffer): boolean {
  let suspiciousBytes = 0;
  const sampleLength = Math.min(buffer.length, 1024);

  for (let index = 0; index < sampleLength; index += 1) {
    const byte = buffer[index];
    if (byte === undefined) {
      continue;
    }

    if (byte === 0) {
      suspiciousBytes += 1;
      continue;
    }

    if (byte < 9 || (byte > 13 && byte < 32)) {
      suspiciousBytes += 1;
    }
  }

  return suspiciousBytes / Math.max(sampleLength, 1) > 0.15;
}

function isAllowedResumeType(file: File): boolean {
  const mimeType = file.type.trim().toLowerCase();
  const extension = getResumeExtension(file.name);

  return SUPPORTED_RESUME_MIME_TYPES.has(mimeType) || SUPPORTED_RESUME_EXTENSIONS.has(extension);
}

function findLastIndexOfSequence(buffer: Buffer, sequence: Buffer, startIndex = buffer.length - sequence.length): number {
  for (let index = Math.min(startIndex, buffer.length - sequence.length); index >= 0; index -= 1) {
    if (buffer.subarray(index, index + sequence.length).equals(sequence)) {
      return index;
    }
  }

  return -1;
}

function readZipCentralDirectory(buffer: Buffer): Array<{
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}> {
  const endSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const endIndex = findLastIndexOfSequence(buffer, endSignature, buffer.length - 22);
  if (endIndex < 0 || endIndex + 22 > buffer.length) {
    throw new ResumeExtractionError("PARSE_FAILED", "Could not read the DOCX archive.");
  }

  const centralDirectoryEntries = buffer.readUInt16LE(endIndex + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endIndex + 16);

  const entries: Array<{
    fileName: string;
    compressionMethod: number;
    compressedSize: number;
    localHeaderOffset: number;
  }> = [];

  let offset = centralDirectoryOffset;
  for (let index = 0; index < centralDirectoryEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    entries.push({
      fileName,
      compressionMethod,
      compressedSize,
      localHeaderOffset
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function inflateZipEntry(buffer: Buffer, localHeaderOffset: number): Buffer {
  if (localHeaderOffset + 30 > buffer.length || buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new ResumeExtractionError("PARSE_FAILED", "Could not read a DOCX entry.");
  }

  const compressionMethod = buffer.readUInt16LE(localHeaderOffset + 8);
  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const compressedSize = buffer.readUInt32LE(localHeaderOffset + 18);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + compressedSize;

  if (dataEnd > buffer.length) {
    throw new ResumeExtractionError("PARSE_FAILED", "The DOCX archive appears to be truncated.");
  }

  const compressed = buffer.subarray(dataStart, dataEnd);
  if (compressionMethod === 0) {
    return Buffer.from(compressed);
  }

  if (compressionMethod !== 8) {
    throw new ResumeExtractionError("PARSE_FAILED", "The DOCX archive uses an unsupported compression method.");
  }

  return Buffer.from(inflateRawSync(compressed));
}

function extractDocxTextFromBuffer(buffer: Buffer): string {
  const entries = readZipCentralDirectory(buffer);
  const documentEntry = entries.find((entry) => entry.fileName === "word/document.xml");

  if (!documentEntry) {
    throw new ResumeExtractionError("PARSE_FAILED", "The DOCX file does not contain a document body.");
  }

  const xml = inflateZipEntry(buffer, documentEntry.localHeaderOffset).toString("utf8");
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => match[0]);

  const blocks = (paragraphs.length > 0 ? paragraphs : [xml]).map((block) => {
    const pieces = [...block.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\/>|<w:tab\/>|<w:cr\/>/g)].map((match) => {
      if (match[0] === "<w:br/>" || match[0] === "<w:cr/>") {
        return "\n";
      }

      if (match[0] === "<w:tab/>") {
        return "\t";
      }

      return decodeXmlEntities(match[1] ?? "");
    });

    return normalizeWhitespace(pieces.join(" ").replace(/\s+\n\s+/g, "\n"));
  });

  return normalizeMultilineText(blocks.filter(Boolean).join("\n"));
}

function readPdfLiteralString(content: string, startIndex: number): { value: string; nextIndex: number } | null {
  let depth = 0;
  let escaped = false;
  let value = "";

  for (let index = startIndex + 1; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      value += `\\${char}`;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "(") {
      depth += 1;
      value += char;
      continue;
    }

    if (char === ")") {
      if (depth === 0) {
        return {
          value: decodePdfTextString(value),
          nextIndex: index + 1
        };
      }

      depth -= 1;
      value += char;
      continue;
    }

    value += char;
  }

  return null;
}

function readPdfHexString(content: string, startIndex: number): { value: string; nextIndex: number } | null {
  let value = "";

  for (let index = startIndex + 1; index < content.length; index += 1) {
    const char = content[index];
    if (char === ">") {
      const cleaned = value.replace(/\s+/g, "");
      if (!cleaned || cleaned.length % 2 !== 0) {
        return null;
      }

      let decoded = "";
      for (let cursor = 0; cursor < cleaned.length; cursor += 2) {
        const byte = Number.parseInt(cleaned.slice(cursor, cursor + 2), 16);
        if (Number.isNaN(byte)) {
          return null;
        }
        decoded += String.fromCharCode(byte);
      }

      return {
        value: decoded,
        nextIndex: index + 1
      };
    }

    value += char;
  }

  return null;
}

function extractPdfTextTokens(content: string): string[] {
  const tokens: string[] = [];

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === "(") {
      const parsed = readPdfLiteralString(content, index);
      if (parsed?.value) {
        tokens.push(parsed.value);
        index = parsed.nextIndex - 1;
      }
      continue;
    }

    if (char === "<" && content[index + 1] !== "<") {
      const parsed = readPdfHexString(content, index);
      if (parsed?.value) {
        tokens.push(parsed.value);
        index = parsed.nextIndex - 1;
      }
    }
  }

  return tokens;
}

function tryInflatePdfStream(buffer: Buffer): Buffer {
  try {
    return Buffer.from(inflateSync(buffer));
  } catch {
    try {
      return Buffer.from(inflateRawSync(buffer));
    } catch {
      return buffer;
    }
  }
}

function extractPdfTextFromBuffer(buffer: Buffer): string {
  const streamMarker = Buffer.from("stream");
  const endStreamMarker = Buffer.from("endstream");
  const collectedTokens: string[] = [];

  let cursor = 0;
  while (cursor < buffer.length) {
    const streamStart = buffer.indexOf(streamMarker, cursor);
    if (streamStart < 0) {
      break;
    }

    const streamDataStart = streamStart + streamMarker.length;
    const contentStart =
      buffer[streamDataStart] === 0x0d && buffer[streamDataStart + 1] === 0x0a
        ? streamDataStart + 2
        : buffer[streamDataStart] === 0x0a || buffer[streamDataStart] === 0x0d
          ? streamDataStart + 1
          : streamDataStart;

    const endStreamStart = buffer.indexOf(endStreamMarker, contentStart);
    if (endStreamStart < 0) {
      break;
    }

    const precedingContextStart = Math.max(0, streamStart - 400);
    const precedingContext = buffer.toString("latin1", precedingContextStart, streamStart);
    const streamContent = buffer.subarray(contentStart, endStreamStart);
    const decodedContent =
      /\/FlateDecode\b/i.test(precedingContext) ? tryInflatePdfStream(streamContent).toString("latin1") : streamContent.toString("latin1");

    collectedTokens.push(...extractPdfTextTokens(decodedContent));
    cursor = endStreamStart + endStreamMarker.length;
  }

  if (collectedTokens.length === 0) {
    collectedTokens.push(...extractPdfTextTokens(buffer.toString("latin1")));
  }

  return normalizeMultilineText(collectedTokens.join("\n"));
}

function extractPlainTextFromBuffer(buffer: Buffer, mimeType: string): string {
  const rawText = buffer.toString("utf8");
  if (mimeType.startsWith("text/") && isProbablyBinary(buffer)) {
    throw new ResumeExtractionError(
      "PARSE_FAILED",
      "The uploaded text file does not look like plain text."
    );
  }

  if (mimeType === "application/rtf" || mimeType === "text/rtf") {
    return stripRtfFormatting(rawText);
  }

  return normalizeMultilineText(rawText);
}

export function validateResumeUploadFile(
  file: File,
  options?: { maxBytes?: number }
): ResumeUploadFileMeta {
  const mimeType = file.type.trim().toLowerCase();
  const extension = getResumeExtension(file.name);
  const maxBytes = options?.maxBytes ?? DEFAULT_RESUME_UPLOAD_MAX_BYTES;

  if (!file.name || file.name.trim().length === 0) {
    throw new ResumeExtractionError("FILE_MISSING", "Please choose a resume file to upload.");
  }

  if (file.size <= 0) {
    throw new ResumeExtractionError("FILE_EMPTY", "The uploaded resume file is empty.");
  }

  if (file.size > maxBytes) {
    throw new ResumeExtractionError("FILE_TOO_LARGE", "Resume files must be 4 MB or smaller.", {
      maxBytes
    });
  }

  if (!isAllowedResumeType(file)) {
    throw new ResumeExtractionError(
      "UNSUPPORTED_TYPE",
      "Unsupported resume format. Upload a PDF, DOCX, TXT, MD, or RTF file.",
      {
        allowedMimeTypes: Array.from(SUPPORTED_RESUME_MIME_TYPES),
        allowedExtensions: Array.from(SUPPORTED_RESUME_EXTENSIONS)
      }
    );
  }

  return {
    name: file.name.trim(),
    mimeType,
    size: file.size,
    extension
  };
}

export async function extractResumeTextFromFile(
  file: File,
  options?: { maxBytes?: number }
): Promise<string> {
  const meta = validateResumeUploadFile(file, options);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (meta.mimeType === "application/pdf" || meta.extension === ".pdf") {
    return extractPdfTextFromBuffer(buffer);
  }

  if (
    meta.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    meta.extension === ".docx"
  ) {
    return extractDocxTextFromBuffer(buffer);
  }

  return extractPlainTextFromBuffer(buffer, meta.mimeType);
}

function takeFirstMeaningfulLine(lines: string[]): string | null {
  for (const rawLine of lines) {
    const line = cleanCandidateText(rawLine);
    if (!line) {
      continue;
    }

    if (CONTACT_LINE_MATCHERS.some((matcher) => matcher.test(line))) {
      continue;
    }

    if (/^(curriculum vitae|resume|cv)$/i.test(line)) {
      continue;
    }

    if (/^(experience|summary|about|bio|specialties|skills|profile)$/i.test(line)) {
      continue;
    }

    if (COMMON_SECTION_HEADERS.has(line.toLowerCase())) {
      continue;
    }

    if (line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 5) {
      return line;
    }
  }

  return null;
}

function extractEmailCandidate(text: string): string | null {
  const matches = text.match(EMAIL_PATTERN) ?? [];
  for (const match of matches) {
    if (isAcceptedWorkEmail(match)) {
      return match.toLowerCase();
    }
  }

  return null;
}

function extractPhoneCandidate(text: string): string | null {
  const matches = text.match(PHONE_PATTERN) ?? [];
  for (const match of matches) {
    const digits = match.replace(/[^\d+]/g, "");
    if (digits.length >= 8) {
      return collapseSpaces(match);
    }
  }

  return null;
}

function extractServiceAreasCandidate(text: string): string[] {
  const districts = new Set<string>();
  for (const match of text.match(POSTCODE_DISTRICT_PATTERN) ?? []) {
    const normalized = match.toUpperCase();
    if (normalized.length <= 4 || /^(CV|CVS)$/.test(normalized)) {
      districts.add(normalized);
      continue;
    }

    districts.add(normalized);
  }

  return Array.from(districts).slice(0, 12);
}

function extractYearsExperienceCandidate(text: string): number | null {
  const explicitMatches = [...text.matchAll(YEARS_EXPERIENCE_PATTERN)].map((match) => Number.parseInt(match[1] ?? "", 10)).filter(Number.isFinite);
  if (explicitMatches.length > 0) {
    return Math.max(...explicitMatches);
  }

  const currentYear = new Date().getFullYear();
  const sinceYearMatches = [...text.matchAll(SINCE_YEAR_PATTERN)]
    .map((match) => Number.parseInt(match[1] ?? "", 10))
    .filter((year) => Number.isInteger(year) && year <= currentYear);

  if (sinceYearMatches.length === 0) {
    return null;
  }

  const earliest = Math.min(...sinceYearMatches);
  const calculatedYears = currentYear - earliest;
  return calculatedYears >= 0 && calculatedYears <= 60 ? calculatedYears : null;
}

function extractJobTitleCandidate(text: string): string | null {
  for (const matcher of JOB_TITLE_MATCHERS) {
    if (matcher.pattern.test(text)) {
      return matcher.label;
    }
  }

  const lines = text.split("\n").map((line) => cleanCandidateText(line)).filter(Boolean);
  for (const line of lines.slice(0, 12)) {
    if (/estate agent|property consultant|sales negotiator|branch manager|director|partner|valuer/i.test(line)) {
      return toTitleish(line);
    }
  }

  return null;
}

function extractAgencyNameCandidate(text: string): string | null {
  const lines = text.split("\n").map((line) => cleanCandidateText(line)).filter(Boolean);

  for (const line of lines.slice(0, 16)) {
    if (CONTACT_LINE_MATCHERS.some((matcher) => matcher.test(line))) {
      continue;
    }

    if (/^(curriculum vitae|resume|cv)$/i.test(line)) {
      continue;
    }

    if (AGENCY_MATCHERS.some((matcher) => matcher.test(line)) && line.length <= 80) {
      return line;
    }
  }

  for (const matcher of AGENCY_MATCHER_FALLBACKS) {
    const match = text.match(matcher);
    if (match?.[1]) {
      return cleanCandidateText(match[1]);
    }
  }

  return null;
}

const AGENCY_MATCHER_FALLBACKS: RegExp[] = [
  /\b(?:current employer|employer|company|agency|brokerage)\s*[:\-]\s*([^\n;]{3,80})/i,
  /\b(?:joined|at)\s+([A-Z][A-Za-z0-9&'.-]+(?:\s+[A-Z][A-Za-z0-9&'.-]+){0,6})/i
];

function extractBioCandidate(text: string): string | null {
  const paragraphs = normalizeMultilineText(text)
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter((paragraph) => paragraph.length >= 80);

  if (paragraphs.length === 0) {
    return null;
  }

  const ranked = paragraphs
    .map((paragraph) => {
      const lower = paragraph.toLowerCase();
      const keywordHits = GENERIC_BIO_KEYWORDS.filter((keyword) => lower.includes(keyword)).length;
      const sectionBonus = /summary|about|profile|expertise|overview/i.test(paragraph) ? 3 : 0;
      return {
        paragraph,
        score: keywordHits * 2 + sectionBonus + Math.min(paragraph.length / 100, 4)
      };
    })
    .sort((left, right) => right.score - left.score);

  const candidate = ranked[0]?.paragraph ?? null;
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.length > 340 ? `${candidate.slice(0, 337).trimEnd()}...` : candidate;
  return trimmed;
}

function extractSpecialtiesCandidate(text: string): string[] {
  const specialties = new Set<string>();
  for (const matcher of SPECIALTY_MATCHERS) {
    if (matcher.pattern.test(text)) {
      specialties.add(matcher.label);
    }
  }

  return Array.from(specialties).slice(0, 8);
}

function summarizeResumeText(text: string): string {
  const paragraphs = normalizeMultilineText(text)
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);

  const firstParagraph = paragraphs.find((paragraph) => paragraph.length >= 80) ?? paragraphs[0] ?? text;
  return firstParagraph.length > 360 ? `${firstParagraph.slice(0, 357).trimEnd()}...` : firstParagraph;
}

function removeContactLines(text: string): string {
  const lines = normalizeMultilineText(text)
    .split("\n")
    .map((line) => cleanCandidateText(line))
    .filter(Boolean);

  return lines
    .filter((line) => !CONTACT_LINE_MATCHERS.some((matcher) => matcher.test(line)))
    .join("\n");
}

export function deriveResumePrefillValues(text: string): ResumePrefillValues {
  const normalizedText = normalizeMultilineText(text);
  const cleanedText = removeContactLines(normalizedText);
  const lines = cleanedText.split("\n").map((line) => cleanCandidateText(line)).filter(Boolean);

  const fullName = takeFirstMeaningfulLine(lines);
  const workEmail = extractEmailCandidate(normalizedText);
  const phone = extractPhoneCandidate(normalizedText);
  const agencyName = extractAgencyNameCandidate(normalizedText);
  const jobTitle = extractJobTitleCandidate(normalizedText);
  const yearsExperience = extractYearsExperienceCandidate(normalizedText);
  const bio = extractBioCandidate(cleanedText);
  const serviceAreas = extractServiceAreasCandidate(normalizedText);
  const specialties = extractSpecialtiesCandidate(normalizedText);

  const prefill: ResumePrefillValues = {
    ...(fullName ? { fullName } : {}),
    ...(workEmail ? { workEmail } : {}),
    ...(phone ? { phone } : {}),
    ...(agencyName ? { agencyName } : {}),
    ...(jobTitle ? { jobTitle } : {}),
    ...(yearsExperience !== null ? { yearsExperience } : {}),
    ...(bio ? { bio } : {}),
    ...(serviceAreas.length > 0 ? { serviceAreas } : {}),
    ...(specialties.length > 0 ? { specialties } : {})
  };

  return prefill;
}

export async function createResumeSuggestionsFromFile(file: File): Promise<ResumeSuggestions> {
  const flags = getResumeFeatureFlags();
  const maxBytes = flags.resumeMaxFileMb * 1024 * 1024;
  const meta = validateResumeUploadFile(file, { maxBytes });
  const extractedText = await extractResumeTextFromFile(file, { maxBytes });
  const normalizedText = normalizeMultilineText(extractedText).slice(0, MAX_EXTRACTED_TEXT_LENGTH);

  if (normalizedText.length < MIN_USABLE_TEXT_LENGTH) {
    throw new ResumeExtractionError(
      "TEXT_TOO_SHORT",
      "We could not extract enough text from that resume to generate useful suggestions.",
      {
        extractedCharacters: normalizedText.length,
        minimumCharacters: MIN_USABLE_TEXT_LENGTH
      }
    );
  }

  const prefill = deriveResumePrefillValues(normalizedText);
  const hasSuggestions = Object.values(prefill).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return Boolean(value);
  });

  if (!hasSuggestions) {
    throw new ResumeExtractionError(
      "NO_SUGGESTIONS",
      "We could not confidently extract any onboarding fields from that resume.",
      {
        extractedCharacters: normalizedText.length
      }
    );
  }

  const summary = summarizeResumeText(normalizedText);
  const highlights = [
    ...(prefill.fullName ? ["Detected a candidate name"] : []),
    ...(prefill.workEmail ? ["Detected an email address"] : []),
    ...(prefill.phone ? ["Detected a phone number"] : []),
    ...(prefill.agencyName ? ["Detected an agency or employer"] : []),
    ...(prefill.jobTitle ? ["Detected a likely job title"] : []),
    ...(prefill.yearsExperience !== undefined ? [`Detected approximately ${prefill.yearsExperience} years experience`] : []),
    ...(prefill.serviceAreas?.length ? [`Detected ${prefill.serviceAreas.length} service area${prefill.serviceAreas.length === 1 ? "" : "s"}`] : []),
    ...(prefill.specialties?.length ? [`Detected ${prefill.specialties.length} specialty signal${prefill.specialties.length === 1 ? "" : "s"}`] : [])
  ].slice(0, 8);

  return {
    version: 2,
    suggestionId: `legacy_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
    sourceFileName: meta.name,
    sourceMimeType: meta.mimeType,
    extractedAtIso: new Date().toISOString(),
    extractedTextLength: normalizedText.length,
    summary,
    highlights,
    prefill,
    confidence: {},
    evidence: {},
    warnings: []
  };
}
