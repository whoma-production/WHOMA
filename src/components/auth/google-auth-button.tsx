"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { startTransition, useState } from "react";

import { Button } from "@/components/ui/button";
import { getAuthErrorMessage } from "@/lib/auth/session";

interface GoogleAuthButtonProps {
  redirectTo?: string;
  fullWidth?: boolean;
  providerConfigured: boolean;
}

function GoogleMark(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4">
      <path fill="#EA4335" d="M9 7.36v3.53h4.91c-.21 1.14-.86 2.1-1.84 2.74l2.98 2.31c1.73-1.59 2.73-3.93 2.73-6.72 0-.64-.06-1.25-.16-1.86H9Z" />
      <path fill="#34A853" d="M9 18c2.48 0 4.56-.82 6.08-2.23l-2.98-2.31c-.82.55-1.88.88-3.1.88-2.39 0-4.42-1.61-5.15-3.77H.78v2.38A9 9 0 0 0 9 18Z" />
      <path fill="#4A90E2" d="M3.85 10.57A5.4 5.4 0 0 1 3.56 9c0-.54.1-1.06.29-1.57V5.05H.78A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.05l2.87-2.48Z" />
      <path fill="#FBBC05" d="M9 3.58c1.35 0 2.56.46 3.52 1.37l2.64-2.64C13.55.81 11.47 0 9 0 5.48 0 2.43 2.01.78 5.05l3.07 2.38C4.58 5.19 6.61 3.58 9 3.58Z" />
    </svg>
  );
}

export function GoogleAuthButton({
  redirectTo = "/onboarding/role",
  fullWidth = true,
  providerConfigured
}: GoogleAuthButtonProps): JSX.Element {
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<"google" | "homeowner" | "agent" | "admin" | null>(null);

  const nextParam = searchParams.get("next");
  const oauthError = searchParams.get("error");
  const errorMessage = getAuthErrorMessage(oauthError);
  const target = nextParam ?? redirectTo;
  const showPreviewAccess = !providerConfigured && process.env.NODE_ENV !== "production";
  const isPending = pendingAction !== null;

  function handleGoogleClick(): void {
    if (!providerConfigured || isPending) {
      return;
    }

    setPendingAction("google");

    startTransition(() => {
      void signIn("google", { redirectTo: target });
    });
  }

  function handlePreviewClick(role: "HOMEOWNER" | "AGENT" | "ADMIN"): void {
    if (isPending) {
      return;
    }

    const previewEmail =
      role === "HOMEOWNER"
        ? "homeowner.preview@whoma.local"
        : role === "AGENT"
          ? "agent.preview@whoma.local"
          : "admin.preview@whoma.local";
    const previewRedirectTo =
      role === "HOMEOWNER" ? "/homeowner/instructions" : role === "AGENT" ? "/agent/onboarding" : "/admin/agents";

    setPendingAction(role === "HOMEOWNER" ? "homeowner" : role === "AGENT" ? "agent" : "admin");

    startTransition(() => {
      void signIn("preview", {
        email: previewEmail,
        role,
        redirectTo: nextParam ?? previewRedirectTo
      });
    });
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
        {pendingAction === "google" ? "Redirecting to Google..." : "Continue with Google"}
      </Button>

      {!providerConfigured ? (
        <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
          Google OAuth is not configured yet. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable sign-in.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
          {errorMessage}
        </p>
      ) : null}

      {showPreviewAccess ? (
        <div className="rounded-md border border-line bg-surface-1 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-strong">Local preview access</p>
            <span className="text-xs uppercase tracking-[0.12em] text-text-muted">Dev only</span>
          </div>
          <p className="mb-3 text-xs text-text-muted">
            Use a temporary local role session to explore the platform without Google credentials.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => handlePreviewClick("HOMEOWNER")}
              disabled={isPending}
              aria-busy={pendingAction === "homeowner"}
            >
              {pendingAction === "homeowner" ? "Entering..." : "Preview as Homeowner"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => handlePreviewClick("AGENT")}
              disabled={isPending}
              aria-busy={pendingAction === "agent"}
            >
              {pendingAction === "agent" ? "Entering..." : "Preview as Real Estate Agent"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => handlePreviewClick("ADMIN")}
              disabled={isPending}
              aria-busy={pendingAction === "admin"}
            >
              {pendingAction === "admin" ? "Entering..." : "Preview as Admin"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
