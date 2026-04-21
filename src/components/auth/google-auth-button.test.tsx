import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

describe("GoogleAuthButton", () => {
  it("shows Google plus email/password sign-in controls", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: true,
          email: true,
          any: true
        }}
        authMode="sign-in"
        uxMode="public"
      />
    );

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("hides Google and disables email sign-in when providers are unavailable", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: false,
          email: false,
          any: false
        }}
        authMode="sign-in"
        uxMode="public"
      />
    );

    expect(
      screen.queryByRole("button", { name: /continue with google/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeDisabled();
    expect(
      screen.getByText(/email sign-in is currently unavailable/i)
    ).toBeInTheDocument();
  });

  it("renders confirm-password flow in sign-up mode", () => {
    render(
      <GoogleAuthButton
        providerAvailability={{
          google: true,
          email: true,
          any: true
        }}
        authMode="sign-up"
        uxMode="public"
      />
    );

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
  });
});
