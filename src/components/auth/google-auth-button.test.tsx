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

  it("shows configured public auth methods instead of the old support gate", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: true,
          apple: true,
          email: true,
          any: true
        }}
        uxMode="public"
        supportEmail="support@whoma.co.uk"
      />
    );

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with apple/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with email/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/pilot access/i)).not.toBeInTheDocument();
  });

  it("falls back to direct support when no public auth method is configured", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: false,
          apple: false,
          email: false,
          any: false
        }}
        uxMode="public"
        supportEmail="support@whoma.co.uk"
      />
    );

    expect(screen.getByText(/account access/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /email support/i })
    ).toHaveAttribute("href", "mailto:support@whoma.co.uk");
    expect(
      screen.queryByText(/internal preview access/i)
    ).not.toBeInTheDocument();
  });

  it("shows the extra name field during email sign-up", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: false,
          apple: false,
          email: true,
          any: true
        }}
        authMode="sign-up"
        uxMode="public"
      />
    );

    expect(screen.getByText(/create your account with email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account with email/i })
    ).toBeInTheDocument();
  });

  it("keeps preview controls available in internal mode for qa", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: false,
          apple: false,
          email: false,
          any: false
        }}
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
