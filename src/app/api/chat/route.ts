import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage
} from "ai";
import { z } from "zod";

import {
  sendSupportEmail,
  type SupportTranscriptMessage
} from "@/lib/email/support";
import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";
import {
  buildEscalationDedupeKey,
  registerEscalationAttempt
} from "@/server/support/escalation-dedupe";

const SYSTEM_PROMPT = `You are the support assistant for WHOMA — a UK platform
that connects homeowners with verified independent estate agents.

You help users with:
- Understanding what WHOMA is and how it works
- Signing up and creating an agent profile
- How the agent verification and past deals process works
- Technical issues logging in or using the platform
- General UK property questions (buying, selling, letting)

Keep responses concise, warm, and professional.
If you cannot resolve something, tell the user a real person can help
and that they can click "Talk to a person" in the chat.
When confidence is low, context is missing, or the request should be handled by a human,
call the "escalate_to_support" tool.
Never invent specific agent names, property data, or prices.
Never give legal or financial advice — suggest a qualified professional.`;

const chatPayloadSchema = z
  .object({
    messages: z.array(z.unknown()).min(1).max(40),
    userEmail: z.string().email().optional().nullable(),
    conversationId: z.string().trim().min(1).max(120).optional()
  })
  .strict();

const ESCALATE_PATTERNS = [
  /\b(?:human|real person|real human)\b/i,
  /\bcontact support\b/i,
  /\bsupport email\b/i,
  /\bemail support\b/i,
  /\bcan i email\b/i,
  /\bspeak to someone\b/i,
  /\bspeak to a person\b/i,
  /\btalk to (?:someone|a person|a human)\b/i
];

const RESOLVED_PATTERNS = [
  /\bthanks\b/i,
  /\bthank you\b/i,
  /\bresolved\b/i,
  /\ball good\b/i,
  /\bthat helps\b/i,
  /\bgot it\b/i,
  /\bperfect\b/i
];

const MAX_TRANSCRIPT_MESSAGES = 60;
const MAX_CHAT_MESSAGE_CHARS = 3000;

function isUiMessages(value: unknown): value is UIMessage[] {
  return Array.isArray(value);
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHAT_MESSAGE_CHARS);
}

function getTranscriptMessages(messages: UIMessage[]): SupportTranscriptMessage[] {
  return messages
    .filter(
      (message): message is UIMessage & { role: "user" | "assistant" } =>
        message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role,
      content: getMessageText(message)
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_TRANSCRIPT_MESSAGES);
}

function includesEscalationSignal(text: string): boolean {
  return ESCALATE_PATTERNS.some((pattern) => pattern.test(text));
}

function indicatesResolved(text: string): boolean {
  return RESOLVED_PATTERNS.some((pattern) => pattern.test(text));
}

function shouldEscalateAfterUnresolvedExchange(
  transcriptMessages: SupportTranscriptMessage[],
  latestUserMessage: string
): boolean {
  const userTurns = transcriptMessages.filter((message) => message.role === "user").length;
  const assistantTurns = transcriptMessages.filter(
    (message) => message.role === "assistant"
  ).length;

  if (userTurns < 4 || assistantTurns < 3) {
    return false;
  }

  if (userTurns > 4) {
    return false;
  }

  return !indicatesResolved(latestUserMessage);
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

export async function POST(req: Request): Promise<Response> {
  const clientIp = clientIpFromRequestHeaders(req.headers);
  const rateLimitResult = await checkRateLimit({
    scope: "chat:stream",
    actorId: "public-chat",
    clientIp,
    config: {
      limit: 120,
      windowMs: 60 * 60 * 1000
    }
  });

  if (!rateLimitResult.ok) {
    return Response.json(
      {
        error: "Too many chat requests. Please retry later.",
        retryAfterSeconds: rateLimitResult.retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders(rateLimitResult),
          "Retry-After": String(rateLimitResult.retryAfterSeconds)
        }
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body. Expected { messages: [] }." },
      { status: 400, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  const parsed = chatPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid messages payload.", details: parsed.error.flatten() },
      { status: 400, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  const messages = parsed.data.messages;
  if (!isUiMessages(messages)) {
    return Response.json(
      { error: "Invalid messages payload. Expected an array." },
      { status: 400, headers: rateLimitHeaders(rateLimitResult) }
    );
  }

  const transcriptMessages = getTranscriptMessages(messages);
  const latestUserMessage =
    [...transcriptMessages].reverse().find((message) => message.role === "user")
      ?.content ?? "";

  let escalated = false;
  const escalationDedupeKey = buildEscalationDedupeKey({
    conversationId: parsed.data.conversationId ?? null,
    messages: transcriptMessages
  });

  const escalateOnce = async (): Promise<void> => {
    if (escalated) {
      return;
    }

    if (!registerEscalationAttempt(escalationDedupeKey).accepted) {
      escalated = true;
      return;
    }

    escalated = true;

    try {
      await sendSupportEmail({
        messages: transcriptMessages,
        triggeredBy: "auto",
        ...(parsed.data.userEmail ? { userEmail: parsed.data.userEmail } : {})
      });
    } catch (error) {
      console.error("Automatic support escalation failed", error);
    }
  };

  if (
    includesEscalationSignal(latestUserMessage) ||
    shouldEscalateAfterUnresolvedExchange(transcriptMessages, latestUserMessage)
  ) {
    await escalateOnce();
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    maxOutputTokens: 500,
    stopWhen: stepCountIs(3),
    tools: {
      escalate_to_support: tool({
        description:
          "Escalate the current chat to WHOMA human support when confidence is low or user needs a real person.",
        inputSchema: z.object({
          reason: z
            .string()
            .min(4)
            .max(300)
            .describe("Short reason for escalation.")
        }),
        execute: async () => {
          await escalateOnce();
          return {
            escalated: true
          };
        }
      })
    }
  });

  return result.toUIMessageStreamResponse({
    headers: rateLimitHeaders(rateLimitResult)
  });
}
