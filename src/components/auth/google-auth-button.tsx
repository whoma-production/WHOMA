"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/session";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  PublicAuthProviderAvailability,
  PublicEmailAuthMethod
} from "@/lib/auth/provider-config";

interface GoogleAuthButtonProps {
  redirectTo?: string;
  fullWidth?: boolean;
  providerAvailability: PublicAuthProviderAvailability;
  emailAuthMethod?: PublicEmailAuthMethod;
  authMode?: "sign-in" | "sign-up";
  uxMode?: "public" | "internal";
  allowPreviewAccess?: boolean;
  supportEmail?: string;
  nextParam?: string | null;
  oauthError?: string | null;
}

type PendingAction = "google" | "email" | null;

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

function isEmailCandidate(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildAuthCallbackUrl(target: string): string {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", target);
  return callbackUrl.toString();
}

function mapSupabaseErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("provider") && normalized.includes("not enabled")) {
    return "That sign-in method is unavailable right now. Try email instead.";
  }

  if (normalized.includes("rate limit")) {
    return "Too many sign-in attempts right now. Please wait a moment and try again.";
  }

  if (normalized.includes("invalid email")) {
    return "Enter a valid email address.";
  }

  return "We could not complete sign-in right now. Please try again.";
}

export function GoogleAuthButton({
  redirectTo = "/onboarding/role",
  fullWidth = true,
  providerAvailability,
  emailAuthMethod = "none",
  supportEmail,
  nextParam = null,
  oauthError = null
}: GoogleAuthButtonProps): JSX.Element {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const errorMessage = signInError ?? getAuthErrorMessage(oauthError);
  const target = nextParam ?? redirectTo;
  const isPending = pendingAction !== null;
  const hasPublicAuth = providerAvailability.any;

  async function handleGoogleSignIn(): Promise<void> {
    if (isPending) {
      return;
    }

    if (!providerAvailability.google) {
      setSignInError("Google sign-in is temporarily unavailable.");
      return;
    }

    setPendingAction("google");
    setSignInError(null);
    setEmailSentTo(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthCallbackUrl(target)
      }
    });

    if (error) {
      setSignInError(mapSupabaseErrorMessage(error.message));
      setPendingAction(null);
      return;
    }

    if (data.url) {
      window.location.assign(data.url);
      return;
    }

    setSignInError("Google sign-in did not return a redirect URL.");
    setPendingAction(null);
  }

  async function handleEmailSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (isPending) {
      return;
    }

    if (!providerAvailability.email || emailAuthMethod !== "magic-link") {
      setSignInError("Email sign-in is currently unavailable.");
      return;
    }

    const trimmedEmail = emailAddress.trim().toLowerCase();

    if (!isEmailCandidate(trimmedEmail)) {
      setSignInError("Enter a valid email address.");
      return;
    }

    setPendingAction("email");
    setSignInError(null);
    setEmailSentTo(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: buildAuthCallbackUrl(target)
      }
    });

    if (error) {
      setSignInError(mapSupabaseErrorMessage(error.message));
      setPendingAction(null);
      return;
    }

    setEmailSentTo(trimmedEmail);
    setPendingAction(null);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          fullWidth={fullWidth}
          onClick={() => {
            void handleGoogleSignIn();
          }}
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
      </div>

      <div className="rounded-md border border-line bg-surface-1 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MailMark />
          <p className="text-sm font-medium text-text-strong">Continue with email</p>
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
            {pendingAction === "email"
              ? "Sending secure sign-in link..."
              : "Continue with email"}
          </Button>
        </form>

        {!providerAvailability.email || emailAuthMethod !== "magic-link" ? (
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
        Access is reviewed after sign-in.{" "}
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

      {!hasPublicAuth ? (
        <p className="text-xs text-text-muted">
          Sign-in is temporarily unavailable. Please contact support for access help.
        </p>
      ) : null}
    </div>
  );
}
