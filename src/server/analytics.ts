import type { UserRole } from "@prisma/client";

import {
  recordProductEvent,
  type ProductEventName
} from "@/server/product-events";

export type AnalyticsEventName = ProductEventName;

export type AnalyticsPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

interface TrackEventOptions {
  actorId?: string | null;
  actorRole?: UserRole | null;
  subjectUserId?: string | null;
  source?: string | null;
}

const piiKeys = new Set([
  "email",
  "name",
  "phone",
  "addressLine1",
  "messageBody",
  "message",
  "fullName"
]);

function inferActorId(payload: AnalyticsPayload): string | null {
  const candidate =
    payload.actorId ??
    payload.agentId ??
    payload.homeownerId ??
    payload.senderId ??
    null;

  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}

export function sanitizeAnalyticsPayload(
  payload: AnalyticsPayload
): AnalyticsPayload {
  const sanitized: AnalyticsPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    sanitized[key] = piiKeys.has(key) ? "[REDACTED]" : value;
  }

  return sanitized;
}

export async function trackEvent(
  name: AnalyticsEventName,
  payload: AnalyticsPayload,
  options: TrackEventOptions = {}
): Promise<void> {
  const safePayload = sanitizeAnalyticsPayload(payload);
  const actorId = options.actorId ?? inferActorId(payload);
  const subjectUserId =
    options.subjectUserId ??
    (typeof payload.subjectUserId === "string" ? payload.subjectUserId : null) ??
    (typeof payload.recipientId === "string" ? payload.recipientId : null) ??
    actorId;

  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true") {
    console.info(`[analytics] ${name}`, safePayload);
  }

  await recordProductEvent({
    eventName: name,
    actorRole: options.actorRole ?? null,
    actorId,
    subjectUserId,
    source: options.source ?? null,
    metadata: safePayload
  });
}
