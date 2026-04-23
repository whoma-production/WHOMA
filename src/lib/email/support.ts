import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SUPPORT_FROM = "WHOMA <support@whoma.co.uk>";
const SUPPORT_TO = "support@whoma.co.uk";
const MAX_TRANSCRIPT_MESSAGES = 60;
const MAX_MESSAGE_CONTENT_CHARS = 3000;

export type SupportTrigger = "user_request" | "auto" | "escalation";

export interface SupportTranscriptMessage {
  role: string;
  content: string;
}

function normalizeTranscriptLine(message: SupportTranscriptMessage): string {
  const label = message.role === "user" ? "User" : "WHOMA Bot";
  const cleanContent = message.content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_CONTENT_CHARS);

  return `${label}: ${cleanContent}`;
}

function toTranscript(messages: SupportTranscriptMessage[]): string {
  return messages
    .slice(-MAX_TRANSCRIPT_MESSAGES)
    .map((message) => normalizeTranscriptLine(message))
    .join("\n\n");
}

export async function sendSupportEmail({
  userEmail,
  messages,
  triggeredBy
}: {
  userEmail?: string;
  messages: SupportTranscriptMessage[];
  triggeredBy: SupportTrigger;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const timestamp = new Date().toLocaleString("en-GB");

  await resend.emails.send({
    from: SUPPORT_FROM,
    to: SUPPORT_TO,
    subject: `Support request — ${triggeredBy} — ${timestamp}`,
    text: `
New support request received via chat widget.

Triggered by: ${triggeredBy}
User email: ${userEmail ?? "Not provided (unauthenticated)"}
Time: ${timestamp}

--- CONVERSATION TRANSCRIPT ---
${toTranscript(messages)}
    `.trim()
  });
}
