import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClientMock, verifyOtpMock, exchangeCodeForSessionMock } =
  vi.hoisted(() => ({
    createSupabaseServerClientMock: vi.fn(),
    verifyOtpMock: vi.fn(),
    exchangeCodeForSessionMock: vi.fn()
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createSupabaseServerClientMock
}));

import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  verifyOtpMock.mockReset();
  exchangeCodeForSessionMock.mockReset();
  createSupabaseServerClientMock.mockReset();

  createSupabaseServerClientMock.mockResolvedValue({
    auth: {
      verifyOtp: verifyOtpMock,
      exchangeCodeForSession: exchangeCodeForSessionMock
    }
  });

  verifyOtpMock.mockResolvedValue({ error: null });
  exchangeCodeForSessionMock.mockResolvedValue({ error: null });
});

describe("/auth/callback route", () => {
  it("verifies email confirmation token_hash and redirects to next path", async () => {
    const request = new Request(
      "https://www.whoma.co.uk/auth/callback?token_hash=token-123&type=email&next=%2Fagent%2Fonboarding"
    );

    const response = await GET(request);

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "token-123",
      type: "email"
    });
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://www.whoma.co.uk/agent/onboarding"
    );
  });

  it("exchanges OAuth code for session and redirects to dashboard by default", async () => {
    const request = new Request(
      "https://www.whoma.co.uk/auth/callback?code=oauth-code-123"
    );

    const response = await GET(request);

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("oauth-code-123");
    expect(response.headers.get("location")).toBe(
      "https://www.whoma.co.uk/dashboard"
    );
  });

  it("falls back to OAuth code flow when token type is invalid", async () => {
    const request = new Request(
      "https://www.whoma.co.uk/auth/callback?token_hash=token-123&type=not-valid&code=oauth-code-123"
    );

    const response = await GET(request);

    expect(verifyOtpMock).not.toHaveBeenCalled();
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("oauth-code-123");
    expect(response.headers.get("location")).toBe(
      "https://www.whoma.co.uk/dashboard"
    );
  });

  it("redirects to auth error when both token and code flows fail", async () => {
    verifyOtpMock.mockResolvedValueOnce({
      error: { message: "otp failed" }
    });
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      error: { message: "code exchange failed" }
    });

    const request = new Request(
      "https://www.whoma.co.uk/auth/callback?token_hash=token-123&type=email&code=oauth-code-123"
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://www.whoma.co.uk/auth/error"
    );
  });
});
