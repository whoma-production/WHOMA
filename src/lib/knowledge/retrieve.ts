import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "src/content/support");
const MAX_QUERY_TERMS = 12;
const MAX_SECTIONS = 5;
const MAX_KNOWLEDGE_CHARS = 6000;
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "could",
  "does",
  "from",
  "have",
  "help",
  "into",
  "need",
  "please",
  "should",
  "support",
  "that",
  "their",
  "there",
  "they",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your"
]);

type KnowledgeSection = {
  file: string;
  heading: string;
  body: string;
};

let cachedSections: KnowledgeSection[] | null = null;

function getQueryTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((word) => word.length > 3 && !STOP_WORDS.has(word))
        .slice(0, MAX_QUERY_TERMS) ?? []
    )
  ];
}

function parseSections(file: string, content: string): KnowledgeSection[] {
  const sections: KnowledgeSection[] = [];
  const matches = [...content.matchAll(/^##\s+(.+)\n([\s\S]*?)(?=^##\s+|\s*$)/gm)];

  for (const match of matches) {
    const heading = match[1]?.trim();
    const body = match[2]?.trim();

    if (!heading || !body) {
      continue;
    }

    sections.push({
      file,
      heading,
      body
    });
  }

  return sections;
}

function loadKnowledgeSections(): KnowledgeSection[] {
  if (cachedSections) {
    return cachedSections;
  }

  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  cachedSections = files.flatMap((file) => {
    const content = fs.readFileSync(path.join(KNOWLEDGE_DIR, file), "utf-8");
    return parseSections(file, content);
  });

  return cachedSections;
}

function scoreSection(section: KnowledgeSection, queryTerms: string[]): number {
  const searchable = `${section.heading}\n${section.body}`.toLowerCase();
  return queryTerms.reduce((score, term) => {
    if (!searchable.includes(term)) {
      return score;
    }

    return score + (section.heading.toLowerCase().includes(term) ? 3 : 1);
  }, 0);
}

export function retrieveRelevantKnowledge(query: string): string {
  const queryTerms = getQueryTerms(query);

  if (queryTerms.length === 0) {
    return "";
  }

  const rankedSections = loadKnowledgeSections()
    .map((section) => ({
      section,
      score: scoreSection(section, queryTerms)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.section.file.localeCompare(b.section.file);
    })
    .slice(0, MAX_SECTIONS);

  if (rankedSections.length === 0) {
    return "";
  }

  return rankedSections
    .map(({ section }) => {
      const label = section.file.replace(/\.md$/, "");
      return `[${label}]\n## ${section.heading}\n${section.body}`;
    })
    .join("\n\n---\n\n")
    .slice(0, MAX_KNOWLEDGE_CHARS);
}
