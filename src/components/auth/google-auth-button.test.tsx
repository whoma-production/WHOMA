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
      screen.getByRole("button", { name: /continue with email/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/sign-in is temporarily unavailable/i)
    ).not.toBeInTheDocument();
  });

  it("shows clean unavailable states when social providers are down", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: false,
          apple: false,
          email: true,
          any: true
        }}
        uxMode="public"
        supportEmail="support@whoma.co.uk"
      />
    );

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /continue with apple/i })
    ).toBeDisabled();
    expect(
      screen.getByText(/google sign-in is currently unavailable/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/apple sign-in is currently unavailable/i)
    ).toBeInTheDocument();
  });

  it("uses magic-link email flow copy for both sign-in and sign-up contexts", () => {
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

    expect(screen.getAllByText(/continue with email/i).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with email/i })
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
