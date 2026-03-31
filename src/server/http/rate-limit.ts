import {
  isUpstashConfigured,
  runUpstashCommand,
  runUpstashPipeline
} from "@/server/http/upstash";

type RateLimitWindow = {
  count: number;
  resetAtMs: number;
};

type RateLimitState = Map<string, RateLimitWindow>;

const globalForRateLimit = globalThis as unknown as {
  whomaRateLimitState?: RateLimitState;
};

const rateLimitState: RateLimitState =
  globalForRateLimit.whomaRateLimitState ?? new Map<string, RateLimitWindow>();

if (!globalForRateLimit.whomaRateLimitState) {
  globalForRateLimit.whomaRateLimitState = rateLimitState;
}

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtMs: number;
};

export function clientIpFromRequestHeaders(headers: Headers): string {
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }

  return "unknown";
}

function cleanupExpiredWindows(nowMs: number): void {
  if (rateLimitState.size < 1000) {
    return;
  }

  for (const [key, value] of rateLimitState.entries()) {
    if (value.resetAtMs <= nowMs) {
      rateLimitState.delete(key);
    }
  }
}

function checkRateLimitInMemory(params: {
  scope: string;
  actorId: string;
  clientIp: string;
  config: RateLimitConfig;
  nowMs?: number;
}): RateLimitResult {
  const nowMs = params.nowMs ?? Date.now();
  const key = `${params.scope}:${params.actorId}:${params.clientIp}`;
  const existing = rateLimitState.get(key);

  if (!existing || existing.resetAtMs <= nowMs) {
    const nextWindow: RateLimitWindow = {
      count: 1,
      resetAtMs: nowMs + params.config.windowMs
    };
    rateLimitState.set(key, nextWindow);
    cleanupExpiredWindows(nowMs);

    return {
      ok: true,
      limit: params.config.limit,
      remaining: Math.max(params.config.limit - 1, 0),
      retryAfterSeconds: 0,
      resetAtMs: nextWindow.resetAtMs
    };
  }

  const nextCount = existing.count + 1;
  existing.count = nextCount;
  rateLimitState.set(key, existing);

  const remaining = Math.max(params.config.limit - nextCount, 0);
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((existing.resetAtMs - nowMs) / 1000)
  );

  if (nextCount > params.config.limit) {
    return {
      ok: false,
      limit: params.config.limit,
      remaining: 0,
      retryAfterSeconds,
      resetAtMs: existing.resetAtMs
    };
  }

  return {
    ok: true,
    limit: params.config.limit,
    remaining,
    retryAfterSeconds: 0,
    resetAtMs: existing.resetAtMs
  };
}

async function checkRateLimitWithUpstash(params: {
  scope: string;
  actorId: string;
  clientIp: string;
  config: RateLimitConfig;
  nowMs?: number;
}): Promise<RateLimitResult> {
  const nowMs = params.nowMs ?? Date.now();
  const key = `whoma:rate-limit:${params.scope}:${params.actorId}:${params.clientIp}`;

  const [countValue, , ttlValue] = await runUpstashPipeline([
    ["INCR", key],
    ["PEXPIRE", key, params.config.windowMs, "NX"],
    ["PTTL", key]
  ]);

  const count = Number(countValue);
  let ttlMs = Number(ttlValue);

  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    await runUpstashCommand(["PEXPIRE", key, params.config.windowMs]);
    ttlMs = params.config.windowMs;
  }

  const resetAtMs = nowMs + ttlMs;
  const retryAfterSeconds = Math.max(0, Math.ceil(ttlMs / 1000));

  if (count > params.config.limit) {
    return {
      ok: false,
      limit: params.config.limit,
      remaining: 0,
      retryAfterSeconds,
      resetAtMs
    };
  }

  return {
    ok: true,
    limit: params.config.limit,
    remaining: Math.max(params.config.limit - count, 0),
    retryAfterSeconds: 0,
    resetAtMs
  };
}

export async function checkRateLimit(params: {
  scope: string;
  actorId: string;
  clientIp: string;
  config: RateLimitConfig;
  nowMs?: number;
}): Promise<RateLimitResult> {
  if (!isUpstashConfigured()) {
    return checkRateLimitInMemory(params);
  }

  try {
    return await checkRateLimitWithUpstash(params);
  } catch (error) {
    console.error("Upstash rate limit fallback to memory", error);
    return checkRateLimitInMemory(params);
  }
}
