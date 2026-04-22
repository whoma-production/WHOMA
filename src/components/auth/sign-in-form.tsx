"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { getAuthErrorMessage } from "@/lib/auth/session";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface SignInFormProps {
  oauthError?: string | null;
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

export function SignInForm({ oauthError = null }: SignInFormProps): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [bannerError, setBannerError] = useState<string | null>(
    getAuthErrorMessage(oauthError)
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  function clearErrors(): void {
    setFieldErrors({});
    setBannerError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
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

      window.location.assign("/dashboard");
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

  return (
    <AuthSplitShell valueProp="Sign in to WHOMA">
      <section className="space-y-7">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Welcome back
          </h1>
          <p className="text-base text-zinc-500">Sign in with your email and password.</p>
        </header>

        {bannerError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {bannerError}
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-700">Email address</span>
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
            {fieldErrors.email ? <p className="text-sm text-red-500">{fieldErrors.email}</p> : null}
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
            <Link href="/contact" className="text-sm font-medium text-zinc-500 underline underline-offset-2">
              Forgot password?
            </Link>
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
          <Link href="/sign-up?role=AGENT" className="font-medium text-[#2d6a5a] underline underline-offset-2">
            Create one
          </Link>
        </p>
      </section>
    </AuthSplitShell>
  );
}
