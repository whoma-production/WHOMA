import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  anthropicMock,
  buildEscalationDedupeKeyMock,
  checkRateLimitMock,
  clientIpFromRequestHeadersMock,
  convertToModelMessagesMock,
  registerEscalationAttemptMock,
  sendSupportEmailMock,
  stepCountIsMock,
  streamTextMock,
  toolMock
} = vi.hoisted(() => ({
  anthropicMock: vi.fn(() => "mock-model"),
  buildEscalationDedupeKeyMock: vi.fn(() => "conversation:test"),
  checkRateLimitMock: vi.fn(),
  clientIpFromRequestHeadersMock: vi.fn(() => "127.0.0.1"),
  convertToModelMessagesMock: vi.fn(),
  registerEscalationAttemptMock: vi.fn(),
  sendSupportEmailMock: vi.fn(),
  stepCountIsMock: vi.fn(() => "stop-after-3"),
  streamTextMock: vi.fn(),
  toolMock: vi.fn((definition: unknown) => definition)
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: anthropicMock
}));

vi.mock("ai", () => ({
  convertToModelMessages: convertToModelMessagesMock,
  stepCountIs: stepCountIsMock,
  streamText: streamTextMock,
  tool: toolMock
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

import { POST } from "@/app/api/chat/route";

function createTextMessage(role: "user" | "assistant", text: string) {
  return {
    id: `${role}-${text.slice(0, 12)}`,
    role,
    parts: [{ type: "text", text }]
  };
}

function createBaseRateLimitResult() {
  return {
    ok: true as const,
    limit: 120,
    remaining: 119,
    retryAfterSeconds: 0,
    resetAtMs: Date.now() + 60_000
  };
}

beforeEach(() => {
  anthropicMock.mockClear();
  buildEscalationDedupeKeyMock.mockClear();
  checkRateLimitMock.mockReset();
  clientIpFromRequestHeadersMock.mockClear();
  convertToModelMessagesMock.mockReset();
  registerEscalationAttemptMock.mockReset();
  sendSupportEmailMock.mockReset();
  stepCountIsMock.mockClear();
  streamTextMock.mockReset();
  toolMock.mockClear();

  checkRateLimitMock.mockResolvedValue(createBaseRateLimitResult());
  convertToModelMessagesMock.mockResolvedValue([]);
  registerEscalationAttemptMock.mockReturnValue({
    accepted: true,
    retryAfterSeconds: 0
  });
  sendSupportEmailMock.mockResolvedValue(undefined);
  streamTextMock.mockImplementation(() => ({
    toUIMessageStreamResponse: ({ headers }: { headers?: HeadersInit } = {}) => {
      const responseInit: ResponseInit = { status: 200 };
      if (headers) {
        responseInit.headers = headers;
      }

      return new Response("ok", responseInit);
    }
  }));
});

describe("/api/chat route", () => {
  it("auto-escalates when user explicitly asks for a real person", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conversation-1",
        messages: [createTextMessage("user", "Can I speak to a real person?")]
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(sendSupportEmailMock).toHaveBeenCalledTimes(1);
    expect(sendSupportEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggeredBy: "auto"
      })
    );
  });

  it("auto-escalates after 4 unresolved back-and-forth exchanges", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conversation-2",
        messages: [
          createTextMessage("user", "I still cannot access my account."),
          createTextMessage("assistant", "Please try resetting your password."),
          createTextMessage("user", "That did not work."),
          createTextMessage("assistant", "Please clear your browser cache."),
          createTextMessage("user", "Still blocked after that."),
          createTextMessage("assistant", "Please retry in incognito mode."),
          createTextMessage("user", "Still no luck at all."),
          createTextMessage("assistant", "I can keep troubleshooting here.")
        ]
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(sendSupportEmailMock).toHaveBeenCalledTimes(1);
    expect(sendSupportEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggeredBy: "auto"
      })
    );
  });

  it("supports low-confidence escalation via tool call path", async () => {
    streamTextMock.mockImplementation((options: Record<string, unknown>) => {
      const tools = options.tools as {
        escalate_to_support: { execute: (input: { reason: string }) => Promise<unknown> };
      };
      void tools.escalate_to_support.execute({ reason: "Low confidence answer." });

      return {
        toUIMessageStreamResponse: ({ headers }: { headers?: HeadersInit } = {}) => {
          const responseInit: ResponseInit = { status: 200 };
          if (headers) {
            responseInit.headers = headers;
          }

          return new Response("ok", responseInit);
        }
      };
    });

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "conversation-3",
        messages: [createTextMessage("user", "Can you confirm a legal position for me?")]
      })
    });

    const response = await POST(request);
    await Promise.resolve();

    expect(response.status).toBe(200);
    expect(sendSupportEmailMock).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for malformed message payloads", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", parts: "not-an-array" }]
      })
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid messages payload");
    expect(sendSupportEmailMock).not.toHaveBeenCalled();
  });

  it("returns 429 when chat route is rate-limited", async () => {
    checkRateLimitMock.mockResolvedValue({
      ok: false,
      limit: 120,
      remaining: 0,
      retryAfterSeconds: 60,
      resetAtMs: Date.now() + 60_000
    });

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [createTextMessage("user", "Help me with login.")]
      })
    });

    const response = await POST(request);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(429);
    expect(body.error).toContain("Too many chat requests");
    expect(sendSupportEmailMock).not.toHaveBeenCalled();
  });
});
