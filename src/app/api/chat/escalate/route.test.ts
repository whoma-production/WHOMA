import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildEscalationDedupeKeyMock,
  checkRateLimitMock,
  clientIpFromRequestHeadersMock,
  registerEscalationAttemptMock,
  sendSupportEmailMock
} = vi.hoisted(() => ({
  buildEscalationDedupeKeyMock: vi.fn(() => "conversation:test"),
  checkRateLimitMock: vi.fn(),
  clientIpFromRequestHeadersMock: vi.fn(() => "127.0.0.1"),
  registerEscalationAttemptMock: vi.fn(),
  sendSupportEmailMock: vi.fn()
}));

vi.mock("@/lib/email/support", () => ({
  sendSupportEmail: sendSupportEmailMock
}));

vi.mock("@/server/http/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  clientIpFromRequestHeaders: clientIpFromRequestHeadersMock
}));

vi.mock("@/server/support/escalation-dedupe", () => ({
  buildEscalationDedupeKey: buildEscalationDedupeKeyMock,
  registerEscalationAttempt: registerEscalationAttemptMock
}));

import { POST } from "@/app/api/chat/escalate/route";

function createBaseRateLimitResult() {
  return {
    ok: true as const,
    limit: 8,
    remaining: 7,
    retryAfterSeconds: 0,
    resetAtMs: Date.now() + 60_000
  };
}

function createEscalationPayload() {
  return {
    conversationId: "conversation-1",
    userEmail: "agent@example.com",
    triggeredBy: "user_request" as const,
    messages: [
      { role: "user" as const, content: "I need to speak to support." },
      { role: "assistant" as const, content: "I can connect you with our support team." }
    ]
  };
}

beforeEach(() => {
  buildEscalationDedupeKeyMock.mockClear();
  checkRateLimitMock.mockReset();
  clientIpFromRequestHeadersMock.mockClear();
  registerEscalationAttemptMock.mockReset();
  sendSupportEmailMock.mockReset();

  checkRateLimitMock.mockResolvedValue(createBaseRateLimitResult());
  registerEscalationAttemptMock.mockReturnValue({
    accepted: true,
    retryAfterSeconds: 0
  });
  sendSupportEmailMock.mockResolvedValue(undefined);
});

describe("/api/chat/escalate route", () => {
  it("sends escalation email for valid payloads", async () => {
    const request = new Request("http://localhost/api/chat/escalate", {
      method: "POST",
      body: JSON.stringify(createEscalationPayload())
    });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendSupportEmailMock).toHaveBeenCalledTimes(1);
    expect(sendSupportEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggeredBy: "user_request",
        userEmail: "agent@example.com"
      })
    );
  });

  it("returns idempotent success when escalation is deduped", async () => {
    registerEscalationAttemptMock.mockReturnValue({
      accepted: false,
      retryAfterSeconds: 120
    });

    const request = new Request("http://localhost/api/chat/escalate", {
      method: "POST",
      body: JSON.stringify(createEscalationPayload())
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      success: boolean;
      deduped: boolean;
      retryAfterSeconds: number;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.deduped).toBe(true);
    expect(body.retryAfterSeconds).toBe(120);
    expect(sendSupportEmailMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const request = new Request("http://localhost/api/chat/escalate", {
      method: "POST",
      body: JSON.stringify({
        triggeredBy: "user_request",
        messages: [{ role: "user", content: "" }]
      })
    });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Invalid escalate payload");
    expect(sendSupportEmailMock).not.toHaveBeenCalled();
  });

  it("returns 429 when escalation route is rate-limited", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      limit: 8,
      remaining: 0,
      retryAfterSeconds: 60,
      resetAtMs: Date.now() + 60_000
    });

    const request = new Request("http://localhost/api/chat/escalate", {
      method: "POST",
      body: JSON.stringify(createEscalationPayload())
    });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; error: string };

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Too many escalation requests");
    expect(sendSupportEmailMock).not.toHaveBeenCalled();
  });
});
