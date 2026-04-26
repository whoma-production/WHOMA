"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import type { PublicAuthProviderAvailability } from "@/lib/auth/provider-config";
import { getAuthErrorMessage } from "@/lib/auth/session";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface SignInFormProps {
  oauthError?: string | null;
  nextPath?: string | null;
  providerAvailability: PublicAuthProviderAvailability;
  resetStatus?: string | null;
  message?: string | null;
}

function isEmailCandidate(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapSupabaseSignInError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Check your email to confirm your account before signing in.";
  }

  if (normalized.includes("rate limit")) {
    return "Too many attempts right now. Please wait a minute and try again.";
  }

  if (normalized.includes("invalid email")) {
    return "Enter a valid email address";
  }

  return "We could not sign you in right now. Please try again.";
}

function buildRecoveryCallbackUrl(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN?.trim();

  if (configuredOrigin) {
    try {
      const url = new URL("/auth/callback", configuredOrigin);
      url.searchParams.set("next", "/auth/reset-password");
      return url.toString();
    } catch {
      // Fallback below.
    }
  }

  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", "/auth/reset-password");
  return url.toString();
}

function buildOAuthCallbackUrl(target: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN?.trim();
  let callbackOrigin = window.location.origin;

  if (configuredOrigin) {
    try {
      callbackOrigin = new URL(configuredOrigin).origin;
    } catch {
      // Fall back to the current host when env config is malformed.
    }
  }

  const url = new URL("/auth/callback", callbackOrigin);
  url.searchParams.set("next", target);
  return url.toString();
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

export function SignInForm({
  nextPath = null,
  oauthError = null,
  providerAvailability,
  resetStatus = null,
  message = null
}: SignInFormProps): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [bannerError, setBannerError] = useState<string | null>(
    getAuthErrorMessage(oauthError)
  );
  const [noticeMessage, setNoticeMessage] = useState<string | null>(
    resetStatus === "updated"
      ? "Password updated successfully. Sign in with your new password."
      : message === "coming-soon"
        ? "Seller registration is not publicly available yet."
        : null
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState<boolean>(false);
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const postAuthTarget = nextPath ?? "/dashboard";

  function clearErrors(): void {
    setFieldErrors({});
    setBannerError(null);
    setNoticeMessage(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    clearErrors();

    const nextFieldErrors: {
      email?: string;
      password?: string;
    } = {};

    const trimmedEmail = email.trim().toLowerCase();

    if (!isEmailCandidate(trimmedEmail)) {
      nextFieldErrors.email = "Enter a valid email address";
    }

    if (password.length < 8) {
      nextFieldErrors.password = "Password must be at least 8 characters";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (error) {
        setBannerError(mapSupabaseSignInError(error.message));
        return;
      }

      window.location.assign(postAuthTarget);
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? mapSupabaseSignInError(error.message)
          : "We could not sign you in right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn(): Promise<void> {
    if (!providerAvailability.google || isSubmitting || isGoogleSubmitting) {
      return;
    }

    clearErrors();
    setIsGoogleSubmitting(true);

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildOAuthCallbackUrl(postAuthTarget)
        }
      });

      if (error) {
        setBannerError(mapSupabaseSignInError(error.message));
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setBannerError("Google sign-in did not return a redirect URL.");
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? mapSupabaseSignInError(error.message)
          : "We could not start Google sign-in right now. Please try again."
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleForgotPassword(): Promise<void> {
    const trimmedEmail = email.trim().toLowerCase();

    if (!isEmailCandidate(trimmedEmail)) {
      setBannerError("Enter your email address to reset your password.");
      return;
    }

    setIsSendingReset(true);
    setBannerError(null);
    setNoticeMessage(null);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: buildRecoveryCallbackUrl()
        }
      );

      if (error) {
        setBannerError(mapSupabaseSignInError(error.message));
        return;
      }

      setNoticeMessage(
        "If an account exists for this email, we sent a password reset link. Check your inbox and spam folder."
      );
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? mapSupabaseSignInError(error.message)
          : "We could not send a password reset email right now. Please try again."
      );
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <AuthSplitShell valueProp="Sign in to WHOMA">
      <section className="space-y-7">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Welcome back
          </h1>
          <p className="text-base text-zinc-500">
            Sign in with your email and password.
          </p>
        </header>

        {bannerError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {bannerError}
          </div>
        ) : null}
        {noticeMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {noticeMessage}
          </div>
        ) : null}

        {providerAvailability.google ? (
          <button
            type="button"
            onClick={() => {
              void handleGoogleSignIn();
            }}
            disabled={isSubmitting || isGoogleSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-base font-semibold text-zinc-800 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleMark />
            {isGoogleSubmitting
              ? "Redirecting to Google..."
              : "Continue with Google"}
          </button>
        ) : null}

        <form
          className="space-y-3"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">
              Email address
            </span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email || bannerError) {
                  clearErrors();
                }
              }}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-zinc-900 placeholder:text-zinc-400 focus:border-[#2d6a5a] focus:outline-none"
            />
            {fieldErrors.email ? (
              <p className="text-sm text-red-500">{fieldErrors.email}</p>
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">Password</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder="At least 8 characters"
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password || bannerError) {
                  clearErrors();
                }
              }}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-zinc-900 placeholder:text-zinc-400 focus:border-[#2d6a5a] focus:outline-none"
            />
            {fieldErrors.password ? (
              <p className="text-sm text-red-500">{fieldErrors.password}</p>
            ) : null}
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                void handleForgotPassword();
              }}
              disabled={isSendingReset || isSubmitting}
              className="text-sm font-medium text-zinc-500 underline underline-offset-2 disabled:opacity-50"
            >
              {isSendingReset ? "Sending reset email..." : "Forgot password?"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#2d6a5a] px-5 py-3.5 text-base font-semibold text-white transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up?role=AGENT"
            className="font-medium text-[#2d6a5a] underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      </section>
    </AuthSplitShell>
  );
}
