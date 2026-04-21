import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const PRODUCT_EVENT_NAMES = {
  profileStarted: "profile_started",
  profileCompleted: "profile_completed",
  transactionLogged: "transaction_logged",
  verificationSent: "verification_sent",
  verificationCompleted: "verification_completed",
  listingCreated: "listing_created",
  profileLinkShared: "profile_link_shared",
  interactionReceived: "interaction_received",
  instructionCreated: "instruction_created",
  instructionPublished: "instruction_published",
  proposalSubmitted: "proposal_submitted",
  proposalShortlisted: "proposal_shortlisted",
  proposalAwarded: "proposal_awarded",
  messageSent: "message_sent",
  supportInquirySubmitted: "support_inquiry_submitted"
} as const;

export type ProductEventName =
  (typeof PRODUCT_EVENT_NAMES)[keyof typeof PRODUCT_EVENT_NAMES];

export type ProductEventMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type ProductEventMetadata = Record<
  string,
  ProductEventMetadataValue
>;

interface RecordProductEventInput {
  eventName: ProductEventName;
  actorRole?: UserRole | null;
  actorId?: string | null;
  subjectUserId?: string | null;
  source?: string | null;
  metadata?: ProductEventMetadata;
}

const piiMetadataKeys = new Set([
  "email",
  "name",
  "phone",
  "addressLine1",
  "messageBody",
  "message",
  "fullName"
]);

function shouldTrackProductEvents(): boolean {
  return process.env.PRODUCT_EVENT_TRACKING_DISABLED !== "true";
}

function sanitizeMetadata(
  metadata: ProductEventMetadata | undefined
): ProductEventMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: ProductEventMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }
    sanitized[key] = piiMetadataKeys.has(key) ? "[REDACTED]" : value;
  }

  return sanitized;
}

export async function recordProductEvent(
  input: RecordProductEventInput
): Promise<void> {
  if (!shouldTrackProductEvents()) {
    return;
  }

  const safeMetadata = sanitizeMetadata(input.metadata);
  const actorId = input.actorId ?? null;
  const subjectUserId = input.subjectUserId ?? actorId;

  if (!process.env.DATABASE_URL) {
    console.info(
      `[product-event] ${input.eventName}`,
      safeMetadata ?? {}
    );
    return;
  }

  try {
    await prisma.productEvent.create({
      data: {
        eventName: input.eventName,
        actorRole: input.actorRole ?? null,
        actorId,
        subjectUserId,
        source: input.source ?? null,
        metadata: safeMetadata ?? {}
      }
    });
  } catch (error) {
    console.warn("[product-event] persistence_failed", {
      eventName: input.eventName,
      source: input.source ?? null,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

export interface AgentHeartbeatEventCounts {
  transactionLogged: number;
  listingCreated: number;
  profileLinkShared: number;
  interactionReceived: number;
  verificationSent: number;
  verificationCompleted: number;
}

export async function getAgentHeartbeatEventCounts(
  userId: string
): Promise<AgentHeartbeatEventCounts> {
  if (!process.env.DATABASE_URL) {
    return {
      transactionLogged: 0,
      listingCreated: 0,
      profileLinkShared: 0,
      interactionReceived: 0,
      verificationSent: 0,
      verificationCompleted: 0
    };
  }

  const targetEventNames = [
    PRODUCT_EVENT_NAMES.transactionLogged,
    PRODUCT_EVENT_NAMES.listingCreated,
    PRODUCT_EVENT_NAMES.profileLinkShared,
    PRODUCT_EVENT_NAMES.interactionReceived,
    PRODUCT_EVENT_NAMES.verificationSent,
    PRODUCT_EVENT_NAMES.verificationCompleted
  ] satisfies ProductEventName[];

  const grouped = await prisma.productEvent.groupBy({
    by: ["eventName"],
    where: {
      subjectUserId: userId,
      eventName: { in: targetEventNames }
    },
    _count: {
      _all: true
    }
  });

  const countsByEvent = new Map<string, number>();
  for (const row of grouped) {
    countsByEvent.set(row.eventName, row._count._all);
  }

  return {
    transactionLogged:
      countsByEvent.get(PRODUCT_EVENT_NAMES.transactionLogged) ?? 0,
    listingCreated: countsByEvent.get(PRODUCT_EVENT_NAMES.listingCreated) ?? 0,
    profileLinkShared:
      countsByEvent.get(PRODUCT_EVENT_NAMES.profileLinkShared) ?? 0,
    interactionReceived:
      countsByEvent.get(PRODUCT_EVENT_NAMES.interactionReceived) ?? 0,
    verificationSent:
      countsByEvent.get(PRODUCT_EVENT_NAMES.verificationSent) ?? 0,
    verificationCompleted:
      countsByEvent.get(PRODUCT_EVENT_NAMES.verificationCompleted) ?? 0
  };
}
