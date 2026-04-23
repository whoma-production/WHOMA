import type { SupportTranscriptMessage } from "@/lib/email/support";

const DEDUPE_WINDOW_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 2000;

const escalationWindowByKey = new Map<string, number>();

function hashText(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function pruneExpiredEntries(nowMs: number): void {
  if (escalationWindowByKey.size === 0) {
    return;
  }

  for (const [key, expiresAtMs] of escalationWindowByKey.entries()) {
    if (expiresAtMs <= nowMs) {
      escalationWindowByKey.delete(key);
    }
  }

  if (escalationWindowByKey.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const entries = [...escalationWindowByKey.entries()].sort((a, b) => a[1] - b[1]);
  const overflowCount = escalationWindowByKey.size - MAX_CACHE_ENTRIES;

  for (let index = 0; index < overflowCount; index += 1) {
    const entry = entries[index];
    if (!entry) {
      break;
    }

    escalationWindowByKey.delete(entry[0]);
  }
}

export function buildEscalationDedupeKey({
  conversationId,
  messages
}: {
  conversationId?: string | null;
  messages: SupportTranscriptMessage[];
}): string {
  const normalizedConversationId = conversationId?.trim();
  if (normalizedConversationId) {
    return `conversation:${normalizedConversationId}`;
  }

  const transcriptSignature = messages
    .slice(-12)
    .map((message) => `${message.role}:${message.content}`)
    .join("|")
    .slice(0, 10_000);

  return `transcript:${hashText(transcriptSignature)}`;
}

export function registerEscalationAttempt(key: string): {
  accepted: boolean;
  retryAfterSeconds: number;
} {
  const nowMs = Date.now();
  pruneExpiredEntries(nowMs);

  const existingExpiryMs = escalationWindowByKey.get(key);
  if (existingExpiryMs && existingExpiryMs > nowMs) {
    return {
      accepted: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existingExpiryMs - nowMs) / 1000))
    };
  }

  escalationWindowByKey.set(key, nowMs + DEDUPE_WINDOW_MS);

  return {
    accepted: true,
    retryAfterSeconds: 0
  };
}
