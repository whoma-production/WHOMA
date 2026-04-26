import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  checkRateLimitMock,
  clientIpFromRequestHeadersMock,
  createSupportInquiryMock
} = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  clientIpFromRequestHeadersMock: vi.fn(() => "127.0.0.1"),
  createSupportInquiryMock: vi.fn()
}));

vi.mock("@/server/http/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  clientIpFromRequestHeaders: clientIpFromRequestHeadersMock
}));

vi.mock("@/server/support/inquiries", async () => {
  const actual = await vi.importActual<typeof import("@/server/support/inquiries")>(
    "@/server/support/inquiries"
  );

  return {
    ...actual,
    createSupportInquiry: createSupportInquiryMock
  };
});

import { POST } from "@/app/api/contact/route";

function createBaseRateLimitResult() {
  return {
    ok: true as const,
    limit: 12,
    remaining: 11,
    retryAfterSeconds: 0,
    resetAtMs: Date.now() + 60_000
  };
}

beforeEach(() => {
  checkRateLimitMock.mockReset();
  clientIpFromRequestHeadersMock.mockClear();
  createSupportInquiryMock.mockReset();

  checkRateLimitMock.mockResolvedValue(createBaseRateLimitResult());
  createSupportInquiryMock.mockResolvedValue({ id: "support_inquiry_1" });
});

describe("/api/contact route", () => {
  it("persists a valid contact request through the support inquiry service", async () => {
    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "Independent agent",
        category: "ONBOARDING",
        message: "I need help completing my agent onboarding profile.",
        pagePath: "/contact",
        source: "/contact"
      })
    });

    const response = await POST(request);
    const body = (await response.json()) as { success?: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(createSupportInquiryMock).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "Independent agent",
      category: "ONBOARDING",
      message: "I need help completing my agent onboarding profile.",
      pagePath: "/contact",
      source: "/contact"
    });
  });

  it("rejects invalid contact requests before persistence", async () => {
    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "A",
        email: "not-an-email",
        category: "GENERAL",
        message: "Too short"
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(createSupportInquiryMock).not.toHaveBeenCalled();
  });

  it("rate-limits public contact submissions", async () => {
    checkRateLimitMock.mockResolvedValueOnce({
      ok: false,
      limit: 12,
      remaining: 0,
      retryAfterSeconds: 42,
      resetAtMs: Date.now() + 42_000
    });

    const request = new Request("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Ada Lovelace",
        email: "ada@example.com",
        category: "GENERAL",
        message: "I need help with my account access issue."
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(createSupportInquiryMock).not.toHaveBeenCalled();
  });
});
