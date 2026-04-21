import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

describe("GoogleAuthButton", () => {
  it("shows Google and email sign-in methods", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: true,
          email: true,
          any: true
        }}
        emailAuthMethod="magic-link"
        uxMode="public"
        supportEmail="support@whoma.co.uk"
      />
    );

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with email/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/apple/i)
    ).not.toBeInTheDocument();
  });

  it("hides Google and shows the email unavailable state when providers are disabled", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: false,
          email: false,
          any: false
        }}
        emailAuthMethod="none"
        uxMode="public"
      />
    );

    expect(
      screen.queryByRole("button", { name: /continue with google/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with email/i })
    ).toBeDisabled();
    expect(
      screen.getByText(/email sign-in is currently unavailable/i)
    ).toBeInTheDocument();
  });

  it("keeps email flow magic-link only without password fields", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: true,
          email: true,
          any: true
        }}
        emailAuthMethod="magic-link"
        authMode="sign-up"
        uxMode="public"
      />
    );

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });

  it("renders otp copy when email auth is configured for codes", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: false,
          email: true,
          any: true
        }}
        emailAuthMethod="otp"
        uxMode="public"
      />
    );

    expect(
      screen.getByRole("button", { name: /email me a code/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/sign-in link sent/i)).not.toBeInTheDocument();
  });
});
