"use client";

import { signIn } from "next-auth/react";
import React, { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

interface GoogleAuthButtonProps {
  redirectTo?: string;
  fullWidth?: boolean;
  providerConfigured: boolean;
  uxMode?: "public" | "internal";
  allowPreviewAccess?: boolean;
  betaSupportEmail?: string;
  betaMessage?: string;
  betaCtaHref?: string;
  betaCtaLabel?: string;
  nextParam?: string | null;
  oauthError?: string | null;
}

type PreviewRole = "HOMEOWNER" | "AGENT" | "ADMIN";
type PendingAction =
  | "google"
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
  providerConfigured,
  uxMode = "public",
  allowPreviewAccess = false,
  betaSupportEmail,
  betaMessage = "Google sign-in is being opened in stages. For now, WHOMA is inviting users into the public beta manually.",
  betaCtaHref,
  betaCtaLabel,
  nextParam = null,
  oauthError = null
}: GoogleAuthButtonProps): JSX.Element {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [previewEmail, setPreviewEmail] = useState<string>("");
  const [previewRole, setPreviewRole] = useState<PreviewRole>("AGENT");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const errorMessage = signInError ?? getAuthErrorMessage(oauthError);
  const target = nextParam ?? redirectTo;
  const isPending = pendingAction !== null;
  const showPreviewAccess =
    uxMode === "internal" && !providerConfigured && allowPreviewAccess;

  async function runSignIn(
    provider: "google" | "preview",
    options: Record<string, string | boolean>,
    fallbackUrl?: string
  ): Promise<void> {
    const response = await signIn(provider, {
      ...options,
      redirect: false
    });

    if (response?.error) {
      setSignInError(
        getAuthErrorMessage(response.error) ??
          "We could not complete sign-in. Try again or contact the pilot team."
      );
      setPendingAction(null);
      return;
    }

    const destination = response?.url ?? fallbackUrl;

    if (destination) {
      window.location.assign(destination);
      return;
    }

    setSignInError(
      "We could not complete sign-in. Try again or contact the pilot team."
    );
    setPendingAction(null);
  }

  function handleGoogleClick(): void {
    if (!providerConfigured || isPending) {
      return;
    }

    setSignInError(null);
    setPendingAction("google");

    void runSignIn("google", { callbackUrl: target }).catch(() => {
      setSignInError(
        "Google sign-in failed before the redirect completed. Try again."
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

    void runSignIn(
      "preview",
      {
        email: resolvedEmail,
        role,
        callbackUrl: destination
      },
      destination
    ).catch(() => {
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

  if (!providerConfigured && uxMode === "public") {
    return (
      <div className="space-y-2">
        {errorMessage ? (
          <p className="border-state-danger/20 bg-state-danger/10 rounded-md border px-3 py-2 text-sm text-state-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="rounded-md border border-line bg-surface-1 p-4 text-left">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-strong">Pilot access</p>
            <p className="text-sm text-text-muted">{betaMessage}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {betaSupportEmail ? (
              <a
                href={`mailto:${betaSupportEmail}`}
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" })
                )}
              >
                Email support
              </a>
            ) : null}
            {betaCtaHref && betaCtaLabel ? (
              <a
                href={betaCtaHref}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" })
                )}
              >
                {betaCtaLabel}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        fullWidth={fullWidth}
        onClick={handleGoogleClick}
        disabled={!providerConfigured || isPending}
        aria-busy={isPending}
      >
        <GoogleMark />
        {pendingAction === "google"
          ? "Redirecting to Google..."
          : "Continue with Google"}
      </Button>

      {errorMessage ? (
        <p className="border-state-danger/20 bg-state-danger/10 rounded-md border px-3 py-2 text-sm text-state-danger">
          {errorMessage}
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
            Use a temporary role session for local QA or automated tests when
            Google credentials are unavailable.
          </p>
          <form onSubmit={handlePreviewSubmit} className="space-y-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-text-muted">
                Email (optional)
              </span>
              <Input
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={previewEmail}
                onChange={(event) => {
                  setPreviewEmail(event.target.value);
                  if (previewError) {
                    setPreviewError(null);
                  }
                }}
                disabled={isPending}
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={previewRole === "HOMEOWNER" ? "primary" : "secondary"}
                fullWidth
                className="min-w-0 whitespace-normal text-center leading-tight"
                disabled={isPending}
                onClick={() => setPreviewRole("HOMEOWNER")}
              >
                Homeowner
              </Button>
              <Button
                type="button"
                variant={previewRole === "AGENT" ? "primary" : "secondary"}
                fullWidth
                className="min-w-0 whitespace-normal text-center leading-tight"
                disabled={isPending}
                onClick={() => setPreviewRole("AGENT")}
              >
                Agent
              </Button>
              <Button
                type="button"
                variant={previewRole === "ADMIN" ? "primary" : "secondary"}
                fullWidth
                className="min-w-0 whitespace-normal text-center leading-tight"
                disabled={isPending}
                onClick={() => setPreviewRole("ADMIN")}
              >
                Admin
              </Button>
            </div>

            <Button
              type="submit"
              variant="secondary"
              fullWidth
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending
                ? "Entering preview..."
                : "Continue with Preview Email"}
            </Button>

            {previewError ? (
              <p className="border-state-danger/20 bg-state-danger/10 rounded-md border px-3 py-2 text-xs text-state-danger">
                {previewError}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
