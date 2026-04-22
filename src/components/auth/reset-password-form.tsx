"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function passwordStrengthError(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }

  return null;
}

function mapResetErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("same password")) {
    return "Choose a new password that is different from your current one.";
  }

  if (normalized.includes("password should be at least") || normalized.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters, including letters and numbers.";
  }

  if (normalized.includes("expired") || normalized.includes("invalid")) {
    return "This reset link is invalid or has expired. Request a new password reset email.";
  }

  return "We could not reset your password right now. Please request a new reset email.";
}

export function ResetPasswordForm(): JSX.Element {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession(): Promise<void> {
      try {
        const supabase = createSupabaseClient();
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (!session) {
          setErrorMessage(
            "This reset link is invalid or has expired. Request a new password reset email from sign in."
          );
          return;
        }

        setIsReady(true);
      } catch {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          "We could not verify your reset session. Please request a new password reset email."
        );
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!isReady || isSubmitting) {
      return;
    }

    const weakPasswordMessage = passwordStrengthError(password);

    if (weakPasswordMessage) {
      setErrorMessage(weakPasswordMessage);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        setErrorMessage(mapResetErrorMessage(error.message));
        return;
      }

      setSuccessMessage("Password updated. Redirecting to sign in...");
      window.setTimeout(() => {
        window.location.assign("/sign-in?reset=updated");
      }, 800);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? mapResetErrorMessage(error.message)
          : "We could not reset your password right now. Please request a new reset email."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady && !errorMessage) {
    return (
      <p className="rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-text-muted">
        Verifying reset link...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="space-y-1">
          <span className="text-sm text-text-muted">New password</span>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            placeholder="Enter a new password"
            disabled={isSubmitting || !isReady}
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-text-muted">Confirm new password</span>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            placeholder="Re-enter your new password"
            disabled={isSubmitting || !isReady}
          />
        </label>

        <Button
          type="submit"
          fullWidth
          disabled={isSubmitting || !isReady}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Updating password..." : "Update password"}
        </Button>
      </form>

      <p className="text-xs text-text-muted">
        Use at least 8 characters, including letters and numbers.
      </p>

      {errorMessage ? (
        <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
          {successMessage}
        </p>
      ) : null}

      <Link
        href="/sign-in"
        className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
      >
        Back to sign in
      </Link>
    </div>
  );
}
