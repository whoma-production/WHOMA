"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/session";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
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

type PendingAction = "google" | "email" | "resend" | null;
type SignUpNoticeTone = "success" | "warning";

interface SignUpNotice {
  tone: SignUpNoticeTone;
  message: string;
}

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

function passwordStrengthError(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }

  return null;
}

function mapSupabaseErrorMessage(
  message: string,
  options?: { authMode?: "sign-in" | "sign-up" }
): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Check your email to confirm your account before signing in.";
  }

  if (normalized.includes("already registered") || normalized.includes("user already exists")) {
    return "An account with this email already exists. Sign in instead.";
  }

  if (normalized.includes("password should be at least") || normalized.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters, including letters and numbers.";
  }

  if (normalized.includes("invalid email")) {
    return "Enter a valid email address.";
  }

  if (normalized.includes("rate limit")) {
    return "Too many attempts right now. Please wait a minute and try again.";
  }

  if (normalized.includes("provider") && normalized.includes("not enabled")) {
    return "Google sign-in is not enabled right now.";
  }

  if (options?.authMode === "sign-up") {
    return "We could not create your account right now. Please try again.";
  }

  return "We could not sign you in right now. Please try again.";
}

function buildOAuthCallbackUrl(target: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN?.trim();
  let callbackOrigin = window.location.origin;

  if (configuredOrigin) {
    try {
      callbackOrigin = new URL(configuredOrigin).origin;
    } catch {
      // Ignore invalid env values and keep the runtime origin fallback.
    }
  }

  const url = new URL("/auth/callback", callbackOrigin);
  url.searchParams.set("next", target);
  return url.toString();
}

export function GoogleAuthButton({
  redirectTo = "/dashboard",
  fullWidth = true,
  providerAvailability,
  authMode = "sign-in",
  supportEmail,
  nextParam = null,
  oauthError = null
}: GoogleAuthButtonProps): JSX.Element {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpNotice, setSignUpNotice] = useState<SignUpNotice | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null
  );

  const errorMessage = signInError ?? getAuthErrorMessage(oauthError);
  const target = nextParam ?? redirectTo;
  const hasPublicAuth = providerAvailability.any;
  const isPending = pendingAction !== null;
  const isSignUp = authMode === "sign-up";

  async function handleGoogleSignIn(): Promise<void> {
    if (isPending || !providerAvailability.google) {
      return;
    }

    setPendingAction("google");
    setSignInError(null);
    setSignUpNotice(null);

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildOAuthCallbackUrl(target)
        }
      });

      if (error) {
        setSignInError(mapSupabaseErrorMessage(error.message));
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setSignInError("Google sign-in did not return a redirect URL.");
    } catch (error) {
      setSignInError(
        error instanceof Error
          ? mapSupabaseErrorMessage(error.message)
          : "We could not complete sign-in right now. Please try again."
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleEmailSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (isPending || !providerAvailability.email) {
      return;
    }

    const trimmedEmail = emailAddress.trim().toLowerCase();

    if (!isEmailCandidate(trimmedEmail)) {
      setSignInError("Enter a valid email address.");
      return;
    }

    if (password.length === 0) {
      setSignInError("Enter your password.");
      return;
    }

    if (isSignUp) {
      const weakPasswordMessage = passwordStrengthError(password);

      if (weakPasswordMessage) {
        setSignInError(weakPasswordMessage);
        return;
      }

      if (password !== confirmPassword) {
        setSignInError("Passwords do not match.");
        return;
      }
    }

    setPendingAction("email");
    setSignInError(null);
    setSignUpNotice(null);

    try {
      const supabase = createSupabaseClient();

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: buildOAuthCallbackUrl(target)
          }
        });

        if (error) {
          setSignInError(
            mapSupabaseErrorMessage(error.message, {
              authMode
            })
          );
          return;
        }

        if (data.session) {
          window.location.assign(target);
          return;
        }

        const identityCount = data.user?.identities?.length ?? 0;

        if (!data.user || identityCount === 0) {
          setConfirmationEmail(trimmedEmail);
          setSignUpNotice({
            tone: "warning",
            message:
              "This email may already be registered. Try signing in, or resend confirmation below if this account is still pending."
          });
          return;
        }

        setConfirmationEmail(trimmedEmail);
        setSignUpNotice({
          tone: "success",
          message:
            "Check your email to confirm your account. If you do not see it in a minute, check spam or resend below."
        });
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (error) {
        setSignInError(
          mapSupabaseErrorMessage(error.message, {
            authMode
          })
        );
        return;
      }

      window.location.assign(target);
    } catch (error) {
      setSignInError(
        error instanceof Error
          ? mapSupabaseErrorMessage(error.message, {
              authMode
            })
          : "We could not complete sign-in right now. Please try again."
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function handleResendConfirmation(): Promise<void> {
    if (isPending || !providerAvailability.email) {
      return;
    }

    const targetEmail = confirmationEmail ?? emailAddress.trim().toLowerCase();

    if (!isEmailCandidate(targetEmail)) {
      setSignInError("Enter a valid email address.");
      return;
    }

    setPendingAction("resend");
    setSignInError(null);
    setSignUpNotice(null);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: buildOAuthCallbackUrl(target)
        }
      });

      if (error) {
        setSignInError(
          mapSupabaseErrorMessage(error.message, {
            authMode: "sign-up"
          })
        );
        return;
      }

      setConfirmationEmail(targetEmail);
      setSignUpNotice({
        tone: "success",
        message:
          "Confirmation email resent. Check your inbox and spam folder."
      });
    } catch (error) {
      setSignInError(
        error instanceof Error
          ? mapSupabaseErrorMessage(error.message, {
              authMode: "sign-up"
            })
          : "We could not resend the confirmation email right now. Please try again."
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      {providerAvailability.google ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth={fullWidth}
            onClick={() => {
              void handleGoogleSignIn();
            }}
            disabled={isPending}
            aria-busy={isPending}
          >
            <GoogleMark />
            {pendingAction === "google"
              ? "Redirecting to Google..."
              : "Continue with Google"}
          </Button>
        </div>
      ) : null}

      <div className="rounded-md border border-line bg-surface-1 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MailMark />
          <p className="text-sm font-medium text-text-strong">
            {isSignUp ? "Create account with email" : "Sign in with email"}
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
                if (signUpNotice) {
                  setSignUpNotice(null);
                }
              }}
              placeholder="you@example.com"
              disabled={isPending || !providerAvailability.email}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-text-muted">Password</span>
            <Input
              type="password"
              value={password}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              onChange={(event) => {
                setPassword(event.target.value);
                if (signInError) {
                  setSignInError(null);
                }
                if (signUpNotice) {
                  setSignUpNotice(null);
                }
              }}
              placeholder={isSignUp ? "Create a password" : "Enter your password"}
              disabled={isPending || !providerAvailability.email}
            />
          </label>

          {isSignUp ? (
            <label className="space-y-1">
              <span className="text-sm text-text-muted">Confirm password</span>
              <Input
                type="password"
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (signInError) {
                    setSignInError(null);
                  }
                  if (signUpNotice) {
                    setSignUpNotice(null);
                  }
                }}
                placeholder="Re-enter your password"
                disabled={isPending || !providerAvailability.email}
              />
            </label>
          ) : null}

          <Button
            type="submit"
            fullWidth
            disabled={isPending || !providerAvailability.email}
            aria-busy={isPending}
          >
            {pendingAction === "email"
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        <p className="mt-2 text-xs text-text-muted">
          {isSignUp
            ? "Use at least 8 characters, including letters and numbers."
            : "Use the email and password linked to your WHOMA account."}
        </p>

        {!providerAvailability.email ? (
          <p className="mt-2 text-xs text-text-muted">
            Email sign-in is currently unavailable.
          </p>
        ) : null}
      </div>

      {signUpNotice ? (
        <div
          className={
            signUpNotice.tone === "success"
              ? "space-y-2 rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success"
              : "space-y-2 rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning"
          }
        >
          <p>{signUpNotice.message}</p>
          {isSignUp && confirmationEmail ? (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={() => {
                void handleResendConfirmation();
              }}
              disabled={isPending || !providerAvailability.email}
            >
              {pendingAction === "resend"
                ? "Resending..."
                : "Resend confirmation email"}
            </Button>
          ) : null}
        </div>
      ) : null}

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
