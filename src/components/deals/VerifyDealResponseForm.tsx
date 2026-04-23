"use client";

import { useMemo, useState, type FormEvent } from "react";

interface VerifyDealResponseFormProps {
  token: string;
  agentName: string;
  initialConfirmed: boolean | null;
  initialState: "active" | "already-confirmed" | "already-recorded";
}

export function VerifyDealResponseForm({
  token,
  agentName,
  initialConfirmed,
  initialState
}: VerifyDealResponseFormProps): JSX.Element {
  const [selectedConfirmed, setSelectedConfirmed] = useState<boolean | null>(
    initialConfirmed
  );
  const [sellerComment, setSellerComment] = useState<string>("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const isLocked = initialState !== "active";
  const prompt = useMemo(() => {
    if (selectedConfirmed === true) {
      return `Anything you'd like to add about working with ${agentName}? (optional)`;
    }

    if (selectedConfirmed === false) {
      return "What's incorrect?";
    }

    return null;
  }, [agentName, selectedConfirmed]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isLocked) {
      return;
    }

    setFieldError(null);
    setBannerError(null);

    if (selectedConfirmed === null) {
      setFieldError("Choose whether this sale is correct.");
      return;
    }

    if (!selectedConfirmed && sellerComment.trim().length < 3) {
      setFieldError("Tell us what is incorrect.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/deals/verify/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          confirmed: selectedConfirmed,
          sellerComment: sellerComment.trim().length > 0 ? sellerComment.trim() : null
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: { message?: string };
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setBannerError(
          payload?.error?.message ??
            "We could not record your response right now."
        );
        return;
      }

      setIsSubmitted(true);
    } catch {
      setBannerError("We could not record your response right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="space-y-4 rounded-xl border border-line bg-surface-1 p-5">
        <h2 className="text-xl font-semibold text-text-strong">
          Thank you. Your response has been recorded.
        </h2>
        <p className="text-sm text-text-muted">
          Want to find a verified agent for your next move?{" "}
          <a
            href="https://www.whoma.co.uk"
            className="font-semibold text-[#2d6a5a] underline underline-offset-2"
          >
            → whoma.co.uk
          </a>
        </p>
      </div>
    );
  }

  if (isLocked && initialState === "already-confirmed") {
    return (
      <div className="space-y-4 rounded-xl border border-line bg-surface-1 p-5">
        <h2 className="text-xl font-semibold text-text-strong">Already confirmed</h2>
        <p className="text-sm text-text-muted">
          This sale has already been confirmed. Thank you for helping WHOMA keep
          agent profiles trustworthy.
        </p>
      </div>
    );
  }

  if (isLocked && initialState === "already-recorded") {
    return (
      <div className="space-y-4 rounded-xl border border-line bg-surface-1 p-5">
        <h2 className="text-xl font-semibold text-text-strong">Response already recorded</h2>
        <p className="text-sm text-text-muted">
          This verification link has already been used and your previous response
          is on record.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-line bg-surface-1 p-5"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-strong">Confirm this sale</h2>
        <p className="text-sm text-text-muted">
          Your confirmation helps independent agents build verified reputations.
        </p>
      </div>

      {selectedConfirmed === null ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setSelectedConfirmed(true);
              setFieldError(null);
            }}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-text-strong transition-colors hover:border-[#2d6a5a]"
          >
            Yes, this is correct
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedConfirmed(false);
              setFieldError(null);
            }}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-text-strong transition-colors hover:border-[#2d6a5a]"
          >
            No, this is incorrect
          </button>
        </div>
      ) : null}

      {prompt ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-text-strong">{prompt}</span>
          <textarea
            value={sellerComment}
            onChange={(event) => {
              setSellerComment(event.target.value);
              if (fieldError) {
                setFieldError(null);
              }
            }}
            rows={4}
            className="w-full rounded-xl border border-line px-3 py-2 text-text-strong placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
            placeholder={
              selectedConfirmed
                ? "Optional comment"
                : "Please tell us what is incorrect"
            }
          />
        </label>
      ) : null}

      {fieldError ? (
        <p className="text-sm text-state-danger">{fieldError}</p>
      ) : null}

      {bannerError ? (
        <p className="rounded-md border border-state-danger/25 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
          {bannerError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || selectedConfirmed === null}
        className={`h-11 w-full rounded-xl px-5 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
          isSubmitting
            ? "animate-[verify-submit-shimmer_1.25s_linear_infinite] bg-[length:200%_100%] bg-gradient-to-r from-[#2d6a5a] via-[#4f9586] to-[#2d6a5a]"
            : "bg-[#2d6a5a]"
        }`}
      >
        {isSubmitting
          ? "Submitting..."
          : selectedConfirmed
            ? "Confirm"
            : "Submit"}
      </button>

      <style jsx>{`
        @keyframes verify-submit-shimmer {
          0% {
            background-position: 100% 0;
          }

          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </form>
  );
}
