import type { UserRole } from "@prisma/client";

export type AccountAccessState = "APPROVED" | "PENDING" | "DENIED";

export interface AccessHintPayload {
  userId: string;
  role: UserRole | null;
  accessState: AccountAccessState;
}

export const ACCESS_HINT_COOKIE_NAME = "whoma_access_hint";

export const ACCESS_HINT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function isAccountAccessState(value: unknown): value is AccountAccessState {
  return value === "APPROVED" || value === "PENDING" || value === "DENIED";
}

function isUserRole(value: unknown): value is UserRole {
  return value === "HOMEOWNER" || value === "AGENT" || value === "ADMIN";
}

export function encodeAccessHint(payload: AccessHintPayload): string {
  return encodeURIComponent(
    JSON.stringify({
      userId: payload.userId,
      role: payload.role,
      accessState: payload.accessState
    })
  );
}

export function decodeAccessHint(
  value: string | undefined | null
): AccessHintPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as {
      userId?: unknown;
      role?: unknown;
      accessState?: unknown;
    };

    if (typeof parsed.userId !== "string" || parsed.userId.length === 0) {
      return null;
    }

    if (parsed.role !== null && !isUserRole(parsed.role)) {
      return null;
    }

    if (!isAccountAccessState(parsed.accessState)) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role ?? null,
      accessState: parsed.accessState
    };
  } catch {
    return null;
  }
}
