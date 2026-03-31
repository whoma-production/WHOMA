"use client";

import * as React from "react";

import { FormStepper } from "@/components/form-stepper";
import { ProposalCard } from "@/components/proposal-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineToast, InlineToastLabel } from "@/components/ui/inline-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClientReady } from "@/lib/client-ready";
import {
  proposalInclusionLabels,
  proposalInclusions,
  proposalSubmissionSchema,
  type ProposalSubmissionInput
} from "@/lib/validation/proposal";

const proposalSteps = [
  "Commercials",
  "Service scope",
  "Terms & submit"
] as const;

type ProposalFormState = {
  feeModel: ProposalSubmissionInput["feeModel"];
  feeValue: string;
  timelineDays: string;
  inclusions: ProposalSubmissionInput["inclusions"];
  marketingPlan: string;
  cancellationTerms: string;
};

const initialFormState = {
  feeModel: "FIXED",
  feeValue: "1250",
  timelineDays: "42",
  inclusions: [
    "PROFESSIONAL_PHOTOGRAPHY",
    "FLOORPLAN",
    "PORTAL_LISTINGS"
  ] as ProposalFormState["inclusions"],
  marketingPlan:
    "Portal launch in week one with accompanied viewings and weekly vendor reporting.",
  cancellationTerms:
    "8-week sole agency term followed by rolling 14-day notice."
} satisfies ProposalFormState;

type SubmissionBanner =
  | {
      tone: "success";
      label: string;
      title: string;
      message: string;
    }
  | {
      tone: "warning" | "danger";
      label: string;
      title: string;
      message: string;
    };

const inputClassName =
  "flex h-10 w-full rounded-md border border-line bg-surface-0 px-3 py-2 text-sm text-text-strong placeholder:text-text-muted shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:cursor-not-allowed disabled:opacity-50";

function createIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildPayload(
  instructionId: string,
  form: ProposalFormState
): ProposalSubmissionInput {
  return {
    instructionId,
    feeModel: form.feeModel,
    feeValue: Number(form.feeValue),
    currency: "GBP",
    inclusions: form.inclusions,
    marketingPlan: form.marketingPlan,
    timelineDays: Number(form.timelineDays),
    cancellationTerms: form.cancellationTerms
  };
}

function firstError(errors?: string[]): string | null {
  return errors?.[0] ?? null;
}

function getEnvelopeDetailsMessage(details: unknown): string {
  if (!details || typeof details !== "object") {
    return "";
  }

  const candidate = details as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };

  const formError = firstError(candidate.formErrors);
  if (formError) {
    return formError;
  }

  for (const value of Object.values(candidate.fieldErrors ?? {})) {
    const fieldError = firstError(value);
    if (fieldError) {
      return fieldError;
    }
  }

  return "";
}

export function ProposalBuilderClient({
  instructionId
}: {
  instructionId: string;
}): React.ReactElement {
  const clientReady = useClientReady();
  const [form, setForm] = React.useState<ProposalFormState>(initialFormState);
  const [banner, setBanner] = React.useState<SubmissionBanner | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isFormInteractive = clientReady && !isSubmitting;

  const payload = React.useMemo(
    () => buildPayload(instructionId, form),
    [form, instructionId]
  );
  const validation = React.useMemo(
    () => proposalSubmissionSchema.safeParse(payload),
    [payload]
  );

  const validationErrors = React.useMemo<
    Record<keyof ProposalFormState, string | undefined>
  >(() => {
    if (validation.success) {
      return {
        feeModel: undefined,
        feeValue: undefined,
        timelineDays: undefined,
        inclusions: undefined,
        marketingPlan: undefined,
        cancellationTerms: undefined
      };
    }

    const flattened = validation.error.flatten().fieldErrors;

    return {
      feeModel: firstError(flattened.feeModel) ?? undefined,
      feeValue: firstError(flattened.feeValue) ?? undefined,
      timelineDays: firstError(flattened.timelineDays) ?? undefined,
      inclusions: firstError(flattened.inclusions) ?? undefined,
      marketingPlan: firstError(flattened.marketingPlan) ?? undefined,
      cancellationTerms: firstError(flattened.cancellationTerms) ?? undefined
    };
  }, [validation]);

  const previewProposal = React.useMemo(
    () => ({
      agentName: "Your Agency",
      verificationStatus: "PENDING" as const,
      feeModel: payload.feeModel,
      feeValue: Number.isFinite(payload.feeValue) ? payload.feeValue : 0,
      timelineDays: Number.isFinite(payload.timelineDays)
        ? payload.timelineDays
        : 0,
      inclusions: payload.inclusions.map((key) => proposalInclusionLabels[key]),
      marketingPlan: payload.marketingPlan,
      cancellationTerms: payload.cancellationTerms
    }),
    [payload]
  );

  function updateForm<K extends keyof ProposalFormState>(
    key: K,
    value: ProposalFormState[K]
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
    setBanner(null);
  }

  function toggleInclusion(
    inclusion: ProposalFormState["inclusions"][number]
  ): void {
    setForm((current) => {
      const next = current.inclusions.includes(inclusion)
        ? current.inclusions.filter((item) => item !== inclusion)
        : [...current.inclusions, inclusion];

      return { ...current, inclusions: next };
    });
    setBanner(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setBanner(null);

    const parsed = proposalSubmissionSchema.safeParse(payload);

    if (!parsed.success) {
      setBanner({
        tone: "warning",
        label: "Validation",
        title: "Check the highlighted fields",
        message: "The proposal is not ready to submit yet."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createIdempotencyKey()
        },
        body: JSON.stringify(parsed.data)
      });

      const envelope = (await response.json().catch(() => null)) as {
        ok?: boolean;
        data?: unknown;
        error?: { code?: string; message?: string; details?: unknown };
      } | null;

      if (!response.ok || !envelope || envelope.ok !== true) {
        const error = envelope?.error;
        const code = error?.code ? ` (${error.code})` : "";
        const detailMessage = getEnvelopeDetailsMessage(error?.details);

        setBanner({
          tone: "danger",
          label: "Server error",
          title: "Proposal not submitted",
          message: detailMessage
            ? `${error?.message ?? "Proposal submission failed."}${code} ${detailMessage}`
            : `${error?.message ?? "Proposal submission failed."}${code}`
        });
        return;
      }

      const submittedProposal = envelope.data as
        | { proposal?: { id?: string; status?: string } }
        | undefined;
      const proposalId = submittedProposal?.proposal?.id;

      setBanner({
        tone: "success",
        label: "Submitted",
        title: "Proposal sent successfully",
        message: proposalId
          ? `Proposal ${proposalId} is now submitted and waiting in the marketplace.`
          : "Your proposal is now submitted and waiting in the marketplace."
      });
    } catch {
      setBanner({
        tone: "danger",
        label: "Network error",
        title: "Could not reach the server",
        message: "Please try again in a moment."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const feeModelError = hasAttemptedSubmit ? validationErrors.feeModel : null;
  const feeValueError = hasAttemptedSubmit ? validationErrors.feeValue : null;
  const timelineDaysError = hasAttemptedSubmit
    ? validationErrors.timelineDays
    : null;
  const inclusionsError = hasAttemptedSubmit
    ? validationErrors.inclusions
    : null;
  const marketingPlanError = hasAttemptedSubmit
    ? validationErrors.marketingPlan
    : null;
  const cancellationTermsError = hasAttemptedSubmit
    ? validationErrors.cancellationTerms
    : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Instruction {instructionId}
          </p>
          <h2 className="text-lg">Proposal Builder</h2>
          <p className="text-sm text-text-muted">
            Structured real estate agent proposal form with live preview and
            server-side validation.
          </p>
        </div>

        {banner ? (
          <InlineToast
            className={
              banner.tone === "success"
                ? "border-state-success/30 bg-state-success/5"
                : banner.tone === "warning"
                  ? "border-state-warning/30 bg-state-warning/5"
                  : "border-state-danger/30 bg-state-danger/5"
            }
          >
            <InlineToastLabel>{banner.label}</InlineToastLabel>
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-strong">
                {banner.title}
              </p>
              <p className="text-sm text-text-muted">{banner.message}</p>
            </div>
          </InlineToast>
        ) : null}
        {!clientReady ? (
          <InlineToast className="border-state-warning/30 bg-state-warning/5">
            <InlineToastLabel>Preparing form</InlineToastLabel>
            <p className="text-sm text-text-muted">
              Interactive controls are loading. Submission unlocks once the form
              is ready.
            </p>
          </InlineToast>
        ) : null}

        <FormStepper steps={proposalSteps} currentStep={1} />

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
          data-form-ready={clientReady ? "true" : "false"}
        >
          <fieldset className="space-y-5" disabled={!isFormInteractive}>
            <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">
                Fee model
              </span>
              <select
                className={inputClassName}
                value={form.feeModel}
                onChange={(event) =>
                  updateForm(
                    "feeModel",
                    event.target.value as ProposalFormState["feeModel"]
                  )
                }
                aria-invalid={Boolean(feeModelError)}
                aria-describedby={feeModelError ? "fee-model-error" : undefined}
              >
                {["FIXED", "PERCENT", "HYBRID", "SUCCESS_BANDS"].map(
                  (option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  )
                )}
              </select>
              {feeModelError ? (
                <p id="fee-model-error" className="text-xs text-state-danger">
                  {feeModelError}
                </p>
              ) : null}
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">
                Fee value (GBP or %)
              </span>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="1250"
                value={form.feeValue}
                onChange={(event) => updateForm("feeValue", event.target.value)}
                aria-invalid={Boolean(feeValueError)}
                aria-describedby={feeValueError ? "fee-value-error" : undefined}
              />
              {feeValueError ? (
                <p id="fee-value-error" className="text-xs text-state-danger">
                  {feeValueError}
                </p>
              ) : null}
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-text-strong">
                Timeline (days)
              </span>
              <Input
                type="number"
                min={1}
                max={365}
                placeholder="42"
                value={form.timelineDays}
                onChange={(event) =>
                  updateForm("timelineDays", event.target.value)
                }
                aria-invalid={Boolean(timelineDaysError)}
                aria-describedby={
                  timelineDaysError ? "timeline-days-error" : undefined
                }
              />
              {timelineDaysError ? (
                <p
                  id="timeline-days-error"
                  className="text-xs text-state-danger"
                >
                  {timelineDaysError}
                </p>
              ) : null}
            </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-text-strong">
                Inclusions (structured schema)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {proposalInclusions.map((key) => {
                  const checked = form.inclusions.includes(key);

                  return (
                    <label
                      key={key}
                      className="flex items-start gap-2 rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-text-base"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-line text-brand-accent focus:ring-brand-accent"
                        checked={checked}
                        onChange={() => toggleInclusion(key)}
                      />
                      <span>{proposalInclusionLabels[key]}</span>
                    </label>
                  );
                })}
              </div>
              {inclusionsError ? (
                <p className="text-xs text-state-danger">{inclusionsError}</p>
              ) : null}
            </div>

            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">
                Marketing plan
              </span>
              <Textarea
                placeholder="Explain launch strategy, portal timing, viewings coverage, and communication cadence..."
                value={form.marketingPlan}
                onChange={(event) =>
                  updateForm("marketingPlan", event.target.value)
                }
                aria-invalid={Boolean(marketingPlanError)}
                aria-describedby={
                  marketingPlanError ? "marketing-plan-error" : undefined
                }
              />
              {marketingPlanError ? (
                <p
                  id="marketing-plan-error"
                  className="text-xs text-state-danger"
                >
                  {marketingPlanError}
                </p>
              ) : null}
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">
                Cancellation terms
              </span>
              <Textarea
                placeholder="State sole agency period, notice, and any withdrawal terms clearly."
                value={form.cancellationTerms}
                onChange={(event) =>
                  updateForm("cancellationTerms", event.target.value)
                }
                aria-invalid={Boolean(cancellationTermsError)}
                aria-describedby={
                  cancellationTermsError ? "cancellation-terms-error" : undefined
                }
              />
              {cancellationTermsError ? (
                <p
                  id="cancellation-terms-error"
                  className="text-xs text-state-danger"
                >
                  {cancellationTermsError}
                </p>
              ) : null}
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!isFormInteractive}>
                {isSubmitting ? "Submitting..." : "Submit Proposal"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled
                title="Draft saving is not wired in this slice."
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="tertiary"
                disabled
                title="Chat unlock remains gated by shortlist/award."
              >
                Ask a question (chat gated)
              </Button>
            </div>
          </fieldset>
        </form>
      </Card>

      <ProposalCard title="Live Preview" proposal={previewProposal} />
    </div>
  );
}
