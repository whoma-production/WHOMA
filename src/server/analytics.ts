export type AnalyticsEventName =
  | "instruction_created"
  | "instruction_published"
  | "proposal_submitted"
  | "proposal_shortlisted"
  | "proposal_awarded"
  | "message_sent";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

const piiKeys = new Set(["email", "name", "phone", "addressLine1", "messageBody"]);

export function sanitizeAnalyticsPayload(payload: AnalyticsPayload): AnalyticsPayload {
  const sanitized: AnalyticsPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    sanitized[key] = piiKeys.has(key) ? "[REDACTED]" : value;
  }

  return sanitized;
}

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload): void {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true") {
    return;
  }

  const safePayload = sanitizeAnalyticsPayload(payload);
  console.info(`[analytics] ${name}`, safePayload);
}
