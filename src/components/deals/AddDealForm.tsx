"use client";

import { useMemo, useState, type FormEvent } from "react";

import { extractPostcodeDistrict } from "@/lib/postcode";

type DealRole = "sole_agent" | "joint_agent" | "referral";

type AddDealState = {
  propertyAddress: string;
  propertyPostcode: string;
  completionDate: string;
  role: DealRole;
  salePrice: string;
  sellerName: string;
  sellerEmail: string;
};

const initialState: AddDealState = {
  propertyAddress: "",
  propertyPostcode: "",
  completionDate: "",
  role: "sole_agent",
  salePrice: "",
  sellerName: "",
  sellerEmail: ""
};

function isEmailCandidate(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseFieldErrors(details: unknown): Record<string, string> {
  if (
    typeof details !== "object" ||
    details === null ||
    !("fieldErrors" in details)
  ) {
    return {};
  }

  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (typeof fieldErrors !== "object" || fieldErrors === null) {
    return {};
  }

  const next: Record<string, string> = {};
  for (const [field, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      next[field] = value[0];
    }
  }

  return next;
}

export function AddDealForm(): JSX.Element {
  const [form, setForm] = useState<AddDealState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const trimmedSellerEmail = useMemo(
    () => form.sellerEmail.trim().toLowerCase(),
    [form.sellerEmail]
  );

  function clearNotices(): void {
    setBannerError(null);
    setSuccessMessage(null);
  }

  function validate(): Record<string, string> {
    const nextErrors: Record<string, string> = {};

    if (form.propertyAddress.trim().length < 5) {
      nextErrors.propertyAddress = "Enter the property address.";
    }

    if (extractPostcodeDistrict(form.propertyPostcode) === null) {
      nextErrors.propertyPostcode = "Enter a valid UK postcode.";
    }

    if (!form.completionDate.trim()) {
      nextErrors.completionDate = "Select a completion date.";
    }

    if (form.salePrice.trim().length > 0) {
      const parsed = Number.parseFloat(form.salePrice);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        nextErrors.salePrice = "Enter a valid sale price.";
      }
    }

    if (trimmedSellerEmail.length > 0 && !isEmailCandidate(trimmedSellerEmail)) {
      nextErrors.sellerEmail = "Enter a valid seller email address.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    clearNotices();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const salePriceValue =
      form.salePrice.trim().length > 0
        ? Number.parseFloat(form.salePrice.trim())
        : null;

    try {
      const response = await fetch("/api/deals/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyAddress: form.propertyAddress.trim(),
          propertyPostcode: form.propertyPostcode.trim(),
          completionDate: form.completionDate.trim(),
          role: form.role,
          salePrice: salePriceValue,
          sellerName: form.sellerName.trim().length > 0 ? form.sellerName.trim() : null,
          sellerEmail: trimmedSellerEmail.length > 0 ? trimmedSellerEmail : null
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: {
              message?: string;
              details?: unknown;
            };
            data?: {
              verificationRequested?: boolean;
            };
          }
        | null;

      if (!response.ok || !payload?.ok) {
        const parsedFieldErrors = parseFieldErrors(payload?.error?.details);
        if (Object.keys(parsedFieldErrors).length > 0) {
          setFieldErrors(parsedFieldErrors);
        }

        setBannerError(
          payload?.error?.message ?? "We could not add this deal right now."
        );
        return;
      }

      const verificationRequested = Boolean(payload.data?.verificationRequested);
      if (verificationRequested && trimmedSellerEmail.length > 0) {
        setSuccessMessage(
          `Deal added. Verification request sent to ${trimmedSellerEmail}.`
        );
      } else {
        setSuccessMessage(
          "Deal added. Add seller email later to request verification."
        );
      }

      setForm(initialState);
    } catch {
      setBannerError("We could not add this deal right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="space-y-5 rounded-2xl border border-line bg-surface-1 p-5"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text-strong">Add Past Deal</h2>
        <p className="text-sm text-text-muted">
          Add completed sales so sellers can verify your track record publicly.
        </p>
      </div>

      {bannerError ? (
        <p className="rounded-md border border-state-danger/25 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
          {bannerError}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-state-success/25 bg-state-success/10 px-3 py-2 text-sm text-state-success">
          {successMessage}
        </p>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">Property address</span>
        <input
          type="text"
          value={form.propertyAddress}
          onChange={(event) => {
            setForm((current) => ({ ...current, propertyAddress: event.target.value }));
          }}
          className="h-11 w-full rounded-xl border border-line px-3 text-text-strong placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          placeholder="12 Example Road, London"
          required
        />
        {fieldErrors.propertyAddress ? (
          <p className="text-sm text-state-danger">{fieldErrors.propertyAddress}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">Postcode</span>
        <input
          type="text"
          value={form.propertyPostcode}
          onChange={(event) => {
            setForm((current) => ({ ...current, propertyPostcode: event.target.value }));
          }}
          className="h-11 w-full rounded-xl border border-line px-3 text-text-strong placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          placeholder="SW1A 1AA"
          required
        />
        {fieldErrors.propertyPostcode ? (
          <p className="text-sm text-state-danger">{fieldErrors.propertyPostcode}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">Completion date</span>
        <input
          type="date"
          value={form.completionDate}
          onChange={(event) => {
            setForm((current) => ({ ...current, completionDate: event.target.value }));
          }}
          className="h-11 w-full rounded-xl border border-line px-3 text-text-strong focus:border-brand-accent focus:outline-none"
          required
        />
        {fieldErrors.completionDate ? (
          <p className="text-sm text-state-danger">{fieldErrors.completionDate}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">Your role</span>
        <select
          value={form.role}
          onChange={(event) => {
            setForm((current) => ({
              ...current,
              role: event.target.value as DealRole
            }));
          }}
          className="h-11 w-full rounded-xl border border-line bg-surface-1 px-3 text-text-strong focus:border-brand-accent focus:outline-none"
        >
          <option value="sole_agent">Sole agent</option>
          <option value="joint_agent">Joint agent</option>
          <option value="referral">Referral</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">
          Approximate sale price (optional)
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.salePrice}
          onChange={(event) => {
            setForm((current) => ({ ...current, salePrice: event.target.value }));
          }}
          className="h-11 w-full rounded-xl border border-line px-3 text-text-strong placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          placeholder="450000"
        />
        {fieldErrors.salePrice ? (
          <p className="text-sm text-state-danger">{fieldErrors.salePrice}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">Seller&apos;s name (optional)</span>
        <input
          type="text"
          value={form.sellerName}
          onChange={(event) => {
            setForm((current) => ({ ...current, sellerName: event.target.value }));
          }}
          className="h-11 w-full rounded-xl border border-line px-3 text-text-strong placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          placeholder="Jordan Smith"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-text-strong">Seller&apos;s email (optional)</span>
        <input
          type="email"
          value={form.sellerEmail}
          onChange={(event) => {
            setForm((current) => ({ ...current, sellerEmail: event.target.value }));
          }}
          className="h-11 w-full rounded-xl border border-line px-3 text-text-strong placeholder:text-text-muted focus:border-brand-accent focus:outline-none"
          placeholder="seller@example.com"
        />
        <p className="text-xs text-text-muted">
          We&apos;ll email them to confirm you sold their property.
        </p>
        {fieldErrors.sellerEmail ? (
          <p className="text-sm text-state-danger">{fieldErrors.sellerEmail}</p>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`h-11 w-full rounded-xl px-5 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${
          isSubmitting
            ? "animate-[deal-submit-shimmer_1.25s_linear_infinite] bg-[length:200%_100%] bg-gradient-to-r from-[#2d6a5a] via-[#4f9586] to-[#2d6a5a]"
            : "bg-[#2d6a5a]"
        }`}
      >
        {isSubmitting ? "Adding deal..." : "Add deal"}
      </button>

      <style jsx>{`
        @keyframes deal-submit-shimmer {
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
