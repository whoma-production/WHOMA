"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/session";
import type { PublicAuthProviderAvailability } from "@/lib/auth/provider-config";

interface GoogleAuthButtonProps {
  redirectTo?: string;
  fullWidth?: boolean;
  providerAvailability: PublicAuthProviderAvailability;
  authMode?: "sign-in" | "sign-up";
  uxMode?: "public" | "internal";
  allowPreviewAccess?: boolean;
  supportEmail?: string;
  nextParam?: string | null;
  oauthError?: string | null;
}

type PreviewRole = "HOMEOWNER" | "AGENT" | "ADMIN";
type PendingAction =
  | "google"
  | "apple"
  | "email"
  | "homeowner"
  | "agent"
  | "admin"
  | "preview"
  | null;

function GoogleMark(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M9 7.36v3.53h4.91c-.21 1.14-.86 2.1-1.84 2.74l2.98 2.31c1.73-1.59 2.73-3.93 2.73-6.72 0-.64-.06-1.25-.16-1.86H9Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.48 0 4.56-.82 6.08-2.23l-2.98-2.31c-.82.55-1.88.88-3.1.88-2.39 0-4.42-1.61-5.15-3.77H.78v2.38A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#4A90E2"
        d="M3.85 10.57A5.4 5.4 0 0 1 3.56 9c0-.54.1-1.06.29-1.57V5.05H.78A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.05l2.87-2.48Z"
      />
      <path
        fill="#FBBC05"
        d="M9 3.58c1.35 0 2.56.46 3.52 1.37l2.64-2.64C13.55.81 11.47 0 9 0 5.48 0 2.43 2.01.78 5.05l3.07 2.38C4.58 5.19 6.61 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleMark(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4 fill-current">
      <path d="M12.61 9.62c.02 2.08 1.84 2.78 1.86 2.79-.02.05-.29 1-.97 1.98-.59.84-1.2 1.69-2.17 1.7-.95.02-1.26-.56-2.35-.56-1.09 0-1.44.54-2.33.58-.93.03-1.64-.92-2.24-1.76C3.08 12.2 2.07 8.3 3.43 5.94c.68-1.17 1.89-1.9 3.2-1.92.89-.02 1.73.6 2.35.6.62 0 1.79-.74 3.02-.63.51.02 1.95.21 2.88 1.56-.08.05-1.72 1-1.67 3.07ZM11.12 2.39c.49-.6.82-1.43.73-2.26-.71.03-1.58.48-2.08 1.08-.45.52-.84 1.36-.73 2.16.79.06 1.59-.4 2.08-.98Z" />
    </svg>
  );
}

function MailMark(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4 fill-none stroke-current">
      <path
        d="M2.25 4.5h13.5v9h-13.5Z"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m3 5.25 6 4.5 6-4.5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getDefaultPreviewEmail(role: PreviewRole): string {
  if (role === "HOMEOWNER") {
    return "homeowner.preview@whoma.local";
  }

  if (role === "AGENT") {
    return "agent.preview@whoma.local";
  }

  return "admin.preview@whoma.local";
}

function isEmailCandidate(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function GoogleAuthButton({
  redirectTo = "/onboarding/role",
  fullWidth = true,
  providerAvailability,
  authMode = "sign-in",
  uxMode = "public",
  allowPreviewAccess = false,
  supportEmail,
  nextParam = null,
  oauthError = null
}: GoogleAuthButtonProps): JSX.Element {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [previewEmail, setPreviewEmail] = useState<string>("");
  const [previewRole, setPreviewRole] = useState<PreviewRole>("AGENT");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const errorMessage = signInError ?? getAuthErrorMessage(oauthError);
  const target = nextParam ?? redirectTo;
  const isPending = pendingAction !== null;
  const hasPublicAuth = providerAvailability.any;
  const showPreviewAccess = uxMode === "internal" && allowPreviewAccess;

  async function runSignIn(
    provider: "google" | "apple" | "email" | "preview",
    options: Record<string, string | boolean>
  ): Promise<void> {
    const response = await signIn(provider, {
      ...options,
      redirect: false
    });

    if (response?.error) {
      setSignInError(
        getAuthErrorMessage(response.error) ??
          "We could not complete sign-in. Please try again."
      );
      setPendingAction(null);
      return;
    }

    if (provider === "email") {
      setEmailSentTo(String(options.email ?? ""));
      setPendingAction(null);
      return;
    }

    if (response?.url) {
      window.location.assign(response.url);
      return;
    }

    setSignInError("We could not complete sign-in. Please try again.");
    setPendingAction(null);
  }

  function handleOauthClick(provider: "google" | "apple"): void {
    if (isPending) {
      return;
    }

    if (provider === "google" && !providerAvailability.google) {
      setSignInError("Google sign-in is temporarily unavailable.");
      return;
    }

    if (provider === "apple" && !providerAvailability.apple) {
      setSignInError("Apple sign-in is temporarily unavailable.");
      return;
    }

    setSignInError(null);
    setEmailSentTo(null);
    setPendingAction(provider);

    void runSignIn(provider, { callbackUrl: target }).catch(() => {
      setSignInError(
        `${provider === "google" ? "Google" : "Apple"} sign-in failed before redirect.`
      );
      setPendingAction(null);
    });
  }

  async function handleEmailSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!providerAvailability.email || isPending) {
      return;
    }

    const trimmedEmail = emailAddress.trim().toLowerCase();

    if (!isEmailCandidate(trimmedEmail)) {
      setSignInError("Enter a valid email address.");
      return;
    }

    setSignInError(null);
    setEmailSentTo(null);
    setPendingAction("email");

    await runSignIn("email", {
      email: trimmedEmail,
      callbackUrl: target
    }).catch(() => {
      setSignInError(
        "We could not send your sign-in link right now. Please try again."
      );
      setPendingAction(null);
    });
  }

  function handlePreviewClick(role: PreviewRole, customEmail?: string): void {
    if (isPending) {
      return;
    }

    setSignInError(null);
    const resolvedCustomEmail = customEmail?.trim().toLowerCase();
    const resolvedEmail = resolvedCustomEmail?.length
      ? resolvedCustomEmail
      : getDefaultPreviewEmail(role);
    const previewRedirectTo =
      role === "HOMEOWNER"
        ? "/homeowner/instructions"
        : role === "AGENT"
          ? "/agent/onboarding"
          : "/admin/agents";

    setPendingAction(
      role === "HOMEOWNER" ? "homeowner" : role === "AGENT" ? "agent" : "admin"
    );

    const destination = nextParam ?? previewRedirectTo;

    void runSignIn("preview", {
      email: resolvedEmail,
      role,
      callbackUrl: destination
    }).catch(() => {
      setSignInError(
        "Preview sign-in failed. Check the email and role, then try again."
      );
      setPendingAction(null);
    });
  }

  function handlePreviewSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPreviewError(null);

    const trimmedEmail = previewEmail.trim().toLowerCase();
    if (trimmedEmail.length > 0 && !isEmailCandidate(trimmedEmail)) {
      setPreviewError(
        "Enter a valid email address or leave it empty for temporary preview email."
      );
      return;
    }

    setPendingAction("preview");
    handlePreviewClick(previewRole, trimmedEmail || undefined);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          fullWidth={fullWidth}
          onClick={() => handleOauthClick("google")}
          disabled={isPending || !providerAvailability.google}
          aria-busy={isPending}
        >
          <GoogleMark />
          {pendingAction === "google"
            ? "Redirecting to Google..."
            : "Continue with Google"}
        </Button>
        {!providerAvailability.google ? (
          <p className="text-xs text-text-muted">Google sign-in is currently unavailable.</p>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          fullWidth={fullWidth}
          onClick={() => handleOauthClick("apple")}
          disabled={isPending || !providerAvailability.apple}
          aria-busy={isPending}
          className={providerAvailability.apple ? "border-black bg-black text-white hover:bg-black/90" : undefined}
        >
          <AppleMark />
          {pendingAction === "apple"
            ? "Redirecting to Apple..."
            : "Continue with Apple"}
        </Button>
        {!providerAvailability.apple ? (
          <p className="text-xs text-text-muted">Apple sign-in is currently unavailable.</p>
        ) : null}
      </div>

      <div className="rounded-md border border-line bg-surface-1 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MailMark />
          <p className="text-sm font-medium text-text-strong">
            {authMode === "sign-up" ? "Continue with email" : "Continue with email"}
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <label className="space-y-1">
            <span className="text-sm text-text-muted">Email</span>
            <Input
              type="email"
              value={emailAddress}
              autoComplete="email"
              onChange={(event) => {
                setEmailAddress(event.target.value);
                if (signInError) {
                  setSignInError(null);
                }
              }}
              placeholder="you@example.com"
              disabled={isPending || !providerAvailability.email}
            />
          </label>

          <Button
            type="submit"
            fullWidth
            disabled={isPending || !providerAvailability.email}
            aria-busy={isPending}
          >
            {pendingAction === "email" ? "Sending sign-in link..." : "Continue with email"}
          </Button>
        </form>

        {!providerAvailability.email ? (
          <p className="mt-2 text-xs text-text-muted">
            Email sign-in is currently unavailable.
          </p>
        ) : null}

        {emailSentTo ? (
          <p className="mt-3 rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
            Sign-in link sent to {emailSentTo}. Open your inbox to continue.
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
          {errorMessage}
        </p>
      ) : null}

      <p className="text-xs text-text-muted">
        Access control is applied after sign-in.{" "}
        {supportEmail ? (
          <>
            Need help?{" "}
            <a href={`mailto:${supportEmail}`} className="text-brand-ink underline">
              Contact support
            </a>
            .
          </>
        ) : null}
      </p>

      {!hasPublicAuth && uxMode === "public" ? (
        <p className="text-xs text-text-muted">
          Sign-in is temporarily unavailable. Please contact support for access help.
        </p>
      ) : null}

      {showPreviewAccess ? (
        <div className="rounded-md border border-line bg-surface-1 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-strong">
              Internal preview access
            </p>
            <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
              QA only
            </span>
          </div>
          <p className="mb-3 text-xs text-text-muted">
            Use a temporary role session for local QA or automated tests.
          </p>
          <form onSubmit={handlePreviewSubmit} className="space-y-3">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.12em] text-text-muted">
                Email (optional)
              </span>
              <Input
                type="email"
                placeholder="agent.preview@whoma.local"
                value={previewEmail}
                onChange={(event) => {
                  setPreviewEmail(event.target.value);
                  if (previewError) {
                    setPreviewError(null);
                  }
                }}
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant={previewRole === "HOMEOWNER" ? "primary" : "secondary"}
                onClick={() => setPreviewRole("HOMEOWNER")}
                disabled={isPending}
              >
                Homeowner
              </Button>
              <Button
                type="button"
                variant={previewRole === "AGENT" ? "primary" : "secondary"}
                onClick={() => setPreviewRole("AGENT")}
                disabled={isPending}
              >
                Agent
              </Button>
              <Button
                type="button"
                variant={previewRole === "ADMIN" ? "primary" : "secondary"}
                onClick={() => setPreviewRole("ADMIN")}
                disabled={isPending}
              >
                Admin
              </Button>
            </div>

            <Button type="submit" fullWidth disabled={isPending}>
              {pendingAction === "preview"
                ? "Entering preview..."
                : "Continue with Preview Email"}
            </Button>

            {previewError ? (
              <p className="text-sm text-state-danger">{previewError}</p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
