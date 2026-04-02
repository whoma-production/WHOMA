import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

const { signInMock } = vi.hoisted(() => ({
  signInMock: vi.fn()
}));

vi.mock("next-auth/react", () => ({
  signIn: signInMock
}));

describe("GoogleAuthButton", () => {
  afterEach(() => {
    signInMock.mockReset();
  });

  it("shows a beta gate instead of preview controls in public mode", () => {
    render(
      <GoogleAuthButton
        providerConfigured={false}
        uxMode="public"
        betaSupportEmail="support@whoma.co.uk"
        betaCtaHref="/agents"
        betaCtaLabel="Browse verified agents"
      />
    );

    expect(screen.getByText(/public pilot access/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/internal preview access/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/continue with preview email/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /email support/i })
    ).toHaveAttribute("href", "mailto:support@whoma.co.uk");
  });

  it("keeps preview controls available in internal mode for qa", () => {
    render(
      <GoogleAuthButton
        providerConfigured={false}
        uxMode="internal"
        allowPreviewAccess
      />
    );

    expect(screen.getByText(/internal preview access/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with preview email/i })
    ).toBeInTheDocument();
  });
});
