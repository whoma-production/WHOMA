"use client";

import { EnvelopeSimple, Eye, EyeSlash } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const stepValueProps = {
  2: "Your verified profile starts here",
  3: "One last thing"
} as const;
const stepLabelProps = {
  2: "Step 1 of 2",
  3: "Step 2 of 2"
} as const;

type SignUpStep = 2 | 3;
type SignUpRole = "AGENT";
type TransitionState = "idle" | "out" | "pre-in" | "in";

interface SignUpFlowProps {
  initialRole?: SignUpRole | null;
}

function isEmailCandidate(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildSignupCallbackUrl(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN?.trim();

  if (configuredOrigin) {
    try {
      return new URL("/auth/callback", configuredOrigin).toString();
    } catch {
      // Fall back to runtime origin below.
    }
  }

  return new URL("/auth/callback", window.location.origin).toString();
}

function mapSupabaseSignUpError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("user already exists")) {
    return "An account with this email already exists.";
  }

  if (normalized.includes("invalid email")) {
    return "Enter a valid email address";
  }

  if (normalized.includes("password should be at least") || normalized.includes("weak password")) {
    return "Password must be at least 8 characters";
  }

  if (normalized.includes("rate limit")) {
    return "Too many attempts right now. Please wait a minute and try again.";
  }

  return "We could not create your account right now. Please try again.";
}

function stepTransitionClass(transitionState: TransitionState): string {
  if (transitionState === "out") {
    return "opacity-0 -translate-x-[20px] transition-[opacity,transform] duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)]";
  }

  if (transitionState === "pre-in") {
    return "opacity-0 translate-x-[20px]";
  }

  if (transitionState === "in") {
    return "opacity-100 translate-x-0 transition-[opacity,transform] duration-[250ms] delay-[150ms] ease-[cubic-bezier(0.16,1,0.3,1)]";
  }

  return "opacity-100 translate-x-0";
}

export function SignUpFlow({ initialRole = null }: SignUpFlowProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState<SignUpStep>(2);
  const [transitionState, setTransitionState] = useState<TransitionState>("idle");
  // Seller registration hidden from public — re-enable when seller journey is ready
  const selectedRole: SignUpRole = initialRole ?? "AGENT";

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [confirmationEmail, setConfirmationEmail] = useState<string>("");
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendState, setResendState] = useState<"idle" | "sent">("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  const transitionTimersRef = useRef<number[]>([]);
  const resendTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      transitionTimersRef.current = [];

      if (resendTimerRef.current) {
        window.clearTimeout(resendTimerRef.current);
      }
    };
  }, []);

  function animateToStep(nextStep: SignUpStep): void {
    if (nextStep === currentStep || transitionState === "out" || transitionState === "pre-in") {
      return;
    }

    transitionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    transitionTimersRef.current = [];

    setTransitionState("out");

    const switchTimer = window.setTimeout(() => {
      setCurrentStep(nextStep);
      setTransitionState("pre-in");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionState("in");
        });
      });
    }, 200);

    const settleTimer = window.setTimeout(() => {
      setTransitionState("idle");
    }, 620);

    transitionTimersRef.current.push(switchTimer, settleTimer);
  }

  function clearInlineErrors(): void {
    setFieldErrors({});
    setBannerError(null);
  }

  async function handleCreateAccount(): Promise<void> {
    clearInlineErrors();

    const nextFieldErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const trimmedEmail = email.trim().toLowerCase();

    if (!isEmailCandidate(trimmedEmail)) {
      nextFieldErrors.email = "Enter a valid email address";
    }

    if (password.length < 8) {
      nextFieldErrors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: buildSignupCallbackUrl(),
          data: { role: selectedRole }
        }
      });

      if (error) {
        setBannerError(mapSupabaseSignUpError(error.message));
        return;
      }

      if (!data.user || (data.user.identities?.length ?? 0) === 0) {
        setBannerError("An account with this email may already exist. Try signing in instead.");
        return;
      }

      setConfirmationEmail(trimmedEmail);
      animateToStep(3);
    } catch (error) {
      setBannerError(
        error instanceof Error
          ? mapSupabaseSignUpError(error.message)
          : "We could not create your account right now. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendConfirmation(): Promise<void> {
    if (!confirmationEmail || isResending) {
      return;
    }

    setIsResending(true);
    setResendError(null);

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmationEmail,
        options: {
          emailRedirectTo: buildSignupCallbackUrl()
        }
      });

      if (error) {
        setResendError(mapSupabaseSignUpError(error.message));
        return;
      }

      setResendState("sent");
      if (resendTimerRef.current) {
        window.clearTimeout(resendTimerRef.current);
      }
      resendTimerRef.current = window.setTimeout(() => {
        setResendState("idle");
      }, 3000);
    } catch (error) {
      setResendError(
        error instanceof Error
          ? mapSupabaseSignUpError(error.message)
          : "We could not resend the confirmation email right now."
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthSplitShell
      valueProp={stepValueProps[currentStep]}
      stepLabel={stepLabelProps[currentStep]}
    >
      <div className={`will-change-transform ${stepTransitionClass(transitionState)}`}>
        {currentStep === 2 ? (
          <section className="space-y-7">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                Create your account
              </h1>
              <p className="text-base text-zinc-500">
                Sign in with email and password from day one.
              </p>
            </header>

            {bannerError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {bannerError}
              </div>
            ) : null}

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateAccount();
              }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-700">Email address</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (fieldErrors.email || bannerError) {
                      clearInlineErrors();
                    }
                  }}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-zinc-900 placeholder:text-zinc-400 focus:border-[#2d6a5a] focus:outline-none"
                />
                {fieldErrors.email ? (
                  <p className="text-sm text-red-500">{fieldErrors.email}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-700">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (fieldErrors.password || bannerError) {
                        clearInlineErrors();
                      }
                    }}
                    placeholder="At least 8 characters"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-11 text-zinc-900 placeholder:text-zinc-400 focus:border-[#2d6a5a] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((current) => !current);
                    }}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-zinc-500"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlash className="h-5 w-5" size={20} weight="light" />
                    ) : (
                      <Eye className="h-5 w-5" size={20} weight="light" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-zinc-500">
                  Use at least 8 characters, including uppercase and a number
                </p>
                {fieldErrors.password ? (
                  <p className="text-sm text-red-500">{fieldErrors.password}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-zinc-700">Confirm password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      if (fieldErrors.confirmPassword || bannerError) {
                        clearInlineErrors();
                      }
                    }}
                    placeholder="Re-enter your password"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-11 text-zinc-900 placeholder:text-zinc-400 focus:border-[#2d6a5a] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmPassword((current) => !current);
                    }}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-zinc-500"
                    aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                  >
                    {showConfirmPassword ? (
                      <EyeSlash className="h-5 w-5" size={20} weight="light" />
                    ) : (
                      <Eye className="h-5 w-5" size={20} weight="light" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword ? (
                  <p className="text-sm text-red-500">{fieldErrors.confirmPassword}</p>
                ) : null}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${
                  isSubmitting
                    ? "animate-[whoma-auth-shimmer_1.25s_linear_infinite] bg-[length:200%_100%] bg-gradient-to-r from-[#2d6a5a] via-[#4f9586] to-[#2d6a5a]"
                    : "bg-[#2d6a5a]"
                }`}
              >
                {isSubmitting ? "Creating account" : "Create account"}
              </button>
            </form>

            <p className="text-xs text-zinc-400">
              By continuing you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms of Use
              </Link>
            </p>
          </section>
        ) : null}

        {currentStep === 3 ? (
          <section className="space-y-6 text-center md:text-left">
            <EnvelopeSimple
              className="mx-auto h-16 w-16 text-zinc-300 md:mx-0"
              size={64}
              weight="thin"
              aria-hidden="true"
            />

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                Check your email
              </h1>
              <p className="text-base text-zinc-600">
                We&apos;ve sent a confirmation link to {confirmationEmail}. Click it to activate your
                account.
              </p>
              <p className="text-sm text-zinc-400">
                Didn&apos;t get it? Check your spam folder or contact support.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  void handleResendConfirmation();
                }}
                disabled={isResending}
                className="font-medium text-[#2d6a5a] underline underline-offset-2 disabled:opacity-50"
              >
                {isResending ? "Resending..." : "Resend confirmation email"}
              </button>

              {resendState === "sent" ? (
                <span className="ml-2 text-zinc-500">Sent</span>
              ) : null}

              {resendError ? <p className="text-red-500">{resendError}</p> : null}

              <p>
                <Link href="/auth/login" className="font-medium text-zinc-600 underline underline-offset-2">
                  Back to sign in
                </Link>
              </p>
            </div>
          </section>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes whoma-auth-shimmer {
          0% {
            background-position: 100% 0;
          }

          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </AuthSplitShell>
  );
}
