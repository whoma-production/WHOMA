import { describe, expect, it } from "vitest";

import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";

describe("rate limit", () => {
  it("allows requests up to the limit and blocks after", async () => {
    const config = { limit: 2, windowMs: 10_000 };
    const scope = "test:scope";
    const actorId = "user_1";
    const clientIp = "127.0.0.1";
    const nowMs = 1000;

    const first = await checkRateLimit({
      scope,
      actorId,
      clientIp,
      config,
      nowMs
    });
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await checkRateLimit({
      scope,
      actorId,
      clientIp,
      config,
      nowMs: nowMs + 1
    });
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await checkRateLimit({
      scope,
      actorId,
      clientIp,
      config,
      nowMs: nowMs + 2
    });
    expect(third.ok).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the window after expiration", async () => {
    const config = { limit: 1, windowMs: 1000 };
    const scope = "test:reset";
    const actorId = "user_2";
    const clientIp = "127.0.0.2";
    const nowMs = 2000;

    const first = await checkRateLimit({
      scope,
      actorId,
      clientIp,
      config,
      nowMs
    });
    expect(first.ok).toBe(true);

    const blocked = await checkRateLimit({
      scope,
      actorId,
      clientIp,
      config,
      nowMs: nowMs + 100
    });
    expect(blocked.ok).toBe(false);

    const reset = await checkRateLimit({
      scope,
      actorId,
      clientIp,
      config,
      nowMs: nowMs + 1001
    });
    expect(reset.ok).toBe(true);
    expect(reset.remaining).toBe(0);
  });

  it("extracts client IP from request headers in priority order", () => {
    const fromForwarded = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "198.51.100.10"
    });
    expect(clientIpFromRequestHeaders(fromForwarded)).toBe("203.0.113.10");

    const fromRealIp = new Headers({
      "x-real-ip": "198.51.100.10"
    });
    expect(clientIpFromRequestHeaders(fromRealIp)).toBe("198.51.100.10");

    expect(clientIpFromRequestHeaders(new Headers())).toBe("unknown");
  });
});
