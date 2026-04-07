"use client";

import { useState, type FormEvent, type ReactElement } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormStepper } from "@/components/form-stepper";
import { InlineToast, InlineToastLabel } from "@/components/ui/inline-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClientReady } from "@/lib/client-ready";
import { propertyTypes, targetTimelines } from "@/lib/validation/instruction";

const steps = ["Property basics", "Seller brief", "Launch bid window"] as const;

const propertyTypeLabels: Record<(typeof propertyTypes)[number], string> = {
  FLAT: "Flat",
  TERRACED: "Terraced",
  SEMI_DETACHED: "Semi-detached",
  DETACHED: "Detached",
  BUNGALOW: "Bungalow",
  OTHER: "Other"
};

const targetTimelineLabels: Record<(typeof targetTimelines)[number], string> = {
  ASAP: "ASAP",
  FOUR_TO_EIGHT_WEEKS: "4-8 weeks",
  FLEXIBLE: "Flexible"
};

type FormState = {
  addressLine1: string;
  city: string;
  postcode: string;
  propertyType: (typeof propertyTypes)[number];
  bedrooms: string;
  bathrooms: string;
  shortDescription: string;
  sellerGoals: string;
  targetTimeline: (typeof targetTimelines)[number];
  bidWindowStartAt: string;
  bidWindowEndAt: string;
  bidWindowHours: string;
  mustHaves: string;
};

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; instructionId: string; instructionStatus: string }
  | { kind: "error"; code: string; message: string; details: string[] };

const controlClassName =
  "w-full rounded-md border border-line bg-surface-0 px-3 py-2 text-sm text-text-strong shadow-sm transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0";

function formatDateTimeLocal(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function shiftDateTimeLocal(value: string, hours: number): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const next = new Date(parsed);
  next.setHours(next.getHours() + hours);
  return formatDateTimeLocal(next);
}

function parseWholeHoursBetween(startValue: string, endValue: string): string {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const hours = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  );
  return Number.isFinite(hours) && hours >= 0 ? String(hours) : "";
}

function createInitialFormState(): FormState {
  const bidWindowStartAt = new Date();
  bidWindowStartAt.setMinutes(0, 0, 0);
  bidWindowStartAt.setHours(bidWindowStartAt.getHours() + 1);

  const bidWindowEndAt = new Date(bidWindowStartAt);
  bidWindowEndAt.setHours(bidWindowEndAt.getHours() + 24);

  return {
    addressLine1: "",
    city: "",
    postcode: "",
    propertyType: "FLAT",
    bedrooms: "2",
    bathrooms: "",
    shortDescription: "",
    sellerGoals: "",
    targetTimeline: "ASAP",
    bidWindowStartAt: formatDateTimeLocal(bidWindowStartAt),
    bidWindowEndAt: formatDateTimeLocal(bidWindowEndAt),
    bidWindowHours: "24",
    mustHaves: ""
  };
}

function labelForField(field: string): string {
  switch (field) {
    case "property":
      return "Property";
    case "sellerGoals":
      return "Seller brief";
    case "targetTimeline":
      return "Timeline";
    case "bidWindowStartAt":
      return "Bid window start";
    case "bidWindowEndAt":
      return "Bid window end";
    case "bidWindowHours":
      return "Bid window hours";
    case "mustHaves":
      return "Must-haves";
    default:
      return field;
  }
}

function extractErrorDetails(details: unknown): string[] {
  if (!details) {
    return [];
  }

  if (typeof details === "string") {
    return [details];
  }

  if (Array.isArray(details)) {
    return details.filter((item): item is string => typeof item === "string");
  }

  if (typeof details !== "object") {
    return [];
  }

  const result: string[] = [];
  const candidate = details as {
    formErrors?: unknown;
    fieldErrors?: Record<string, unknown>;
  };

  if (Array.isArray(candidate.formErrors)) {
    result.push(
      ...candidate.formErrors.filter(
        (item): item is string => typeof item === "string"
      )
    );
  }

  if (candidate.fieldErrors && typeof candidate.fieldErrors === "object") {
    for (const [field, value] of Object.entries(candidate.fieldErrors)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === "string") {
            result.push(`${labelForField(field)}: ${entry}`);
          }
        }
      }
    }
  }

  return result;
}

function createIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `instruction-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function CreateInstructionPage(): ReactElement {
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [submission, setSubmission] = useState<SubmissionState>({
    kind: "idle"
  });
  const clientReady = useClientReady();
  const isFormInteractive = clientReady && submission.kind !== "submitting";

  function updateStartAt(nextStartAt: string): void {
    setForm((current) => {
      const hours = Number(current.bidWindowHours);

      return {
        ...current,
        bidWindowStartAt: nextStartAt,
        bidWindowEndAt:
          Number.isFinite(hours) && hours >= 0
            ? shiftDateTimeLocal(nextStartAt, hours)
            : current.bidWindowEndAt
      };
    });
  }

  function updateEndAt(nextEndAt: string): void {
    setForm((current) => ({
      ...current,
      bidWindowEndAt: nextEndAt,
      bidWindowHours:
        parseWholeHoursBetween(current.bidWindowStartAt, nextEndAt) ||
        current.bidWindowHours
    }));
  }

  function updateHours(nextHours: string): void {
    setForm((current) => {
      const parsedHours = Number(nextHours);

      return {
        ...current,
        bidWindowHours: nextHours,
        bidWindowEndAt:
          Number.isFinite(parsedHours) && parsedHours >= 0
            ? shiftDateTimeLocal(current.bidWindowStartAt, parsedHours)
            : current.bidWindowEndAt
      };
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const start = new Date(form.bidWindowStartAt);
    const end = new Date(form.bidWindowEndAt);
    const bidWindowHours = Number(form.bidWindowHours);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setSubmission({
        kind: "error",
        code: "INVALID_DATE",
        message: "Please choose valid bid window dates before submitting.",
        details: []
      });
      return;
    }

    const payload = {
      property: {
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim(),
        propertyType: form.propertyType,
        bedrooms: Number(form.bedrooms),
        bathrooms:
          form.bathrooms.trim() === "" ? undefined : Number(form.bathrooms),
        shortDescription: form.shortDescription.trim(),
        photos: []
      },
      sellerGoals: form.sellerGoals.trim(),
      targetTimeline: form.targetTimeline,
      bidWindowStartAt: start.toISOString(),
      bidWindowEndAt: end.toISOString(),
      bidWindowHours,
      mustHaves: form.mustHaves
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    setSubmission({ kind: "submitting" });

    try {
      const response = await fetch("/api/instructions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createIdempotencyKey()
        },
        body: JSON.stringify(payload)
      });

      const body: unknown = await response.json().catch(() => null);
      const envelope = body as {
        ok?: boolean;
        data?: {
          instruction?: {
            id?: string;
            status?: string;
          };
        };
        error?: {
          code?: string;
          message?: string;
          details?: unknown;
        };
      } | null;

      if (!response.ok || envelope?.ok === false) {
        const error = envelope?.error;
        setSubmission({
          kind: "error",
          code: error?.code ?? `HTTP_${response.status}`,
          message: error?.message ?? "We could not create the instruction.",
          details: extractErrorDetails(error?.details)
        });
        return;
      }

      setSubmission({
        kind: "success",
        instructionId: envelope?.data?.instruction?.id ?? "unknown",
        instructionStatus: envelope?.data?.instruction?.status ?? "created"
      });
    } catch {
      setSubmission({
        kind: "error",
        code: "NETWORK_ERROR",
        message: "We could not reach the server. Please try again.",
        details: []
      });
    }
  }

  return (
    <AppShell role="HOMEOWNER" title="Create Instruction">
      <div className="space-y-6">
        <InlineToast>
          <InlineToastLabel>One clear brief</InlineToastLabel>
          <p className="text-sm text-text-muted">
            Describe the property, your goals, and the response window in one
            pass.
          </p>
        </InlineToast>
        {!clientReady ? (
          <InlineToast className="border-state-warning/30 bg-state-warning/5">
            <InlineToastLabel>Preparing form</InlineToastLabel>
            <p className="text-sm text-text-muted">
              Interactive controls are loading. The form will unlock in a
              moment.
            </p>
          </InlineToast>
        ) : null}

        {submission.kind === "success" ? (
          <InlineToast className="border-state-success/30 bg-state-success/5">
            <InlineToastLabel>Success</InlineToastLabel>
            <p className="text-sm text-text-muted">
              Instruction {submission.instructionId} was created successfully
              and is now{" "}
              <span className="font-medium text-text-strong">
                {submission.instructionStatus}
              </span>
              .
            </p>
          </InlineToast>
        ) : null}

        {submission.kind === "error" ? (
          <InlineToast className="border-state-danger/30 bg-state-danger/5">
            <InlineToastLabel>Error</InlineToastLabel>
            <div className="space-y-2 text-sm text-text-muted">
              <p className="font-medium text-text-strong">
                {submission.code}: {submission.message}
              </p>
              {submission.details.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {submission.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </InlineToast>
        ) : null}

        <Card className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-text-strong">
              Create your sale brief
            </h2>
            <p className="text-sm text-text-muted">
              Keep the structure lean: property details, your goals, and a
              response window that agents can answer against.
            </p>
          </div>

          <FormStepper steps={steps} currentStep={3} />

          <form
            className="space-y-8"
            onSubmit={handleSubmit}
            data-form-ready={clientReady ? "true" : "false"}
          >
            <fieldset className="space-y-4" disabled={!isFormInteractive}>
              <div>
                <h3 className="text-base font-semibold text-text-strong">
                  Property basics
                </h3>
                <p className="text-sm text-text-muted">
                  Describe the home accurately so agents can respond with
                  comparable offers.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-text-strong">
                    Property address line 1
                  </span>
                  <Input
                    required
                    placeholder="123 Example Street"
                    value={form.addressLine1}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        addressLine1: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    City
                  </span>
                  <Input
                    required
                    placeholder="London"
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        city: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Postcode
                  </span>
                  <Input
                    required
                    placeholder="SW1A 1AA"
                    value={form.postcode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        postcode: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Property type
                  </span>
                  <select
                    className={controlClassName}
                    value={form.propertyType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        propertyType: event.target
                          .value as (typeof propertyTypes)[number]
                      }))
                    }
                  >
                    {propertyTypes.map((option) => (
                      <option key={option} value={option}>
                        {propertyTypeLabels[option]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Bedrooms
                  </span>
                  <Input
                    required
                    type="number"
                    min={0}
                    step={1}
                    placeholder="2"
                    value={form.bedrooms}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bedrooms: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Bathrooms
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="1"
                    value={form.bathrooms}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bathrooms: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-text-strong">
                    Short property summary
                  </span>
                  <Textarea
                    required
                    minLength={20}
                    placeholder="Bright two-bedroom flat near transport links, recently renovated kitchen, chain-free seller..."
                    value={form.shortDescription}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shortDescription: event.target.value
                      }))
                    }
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-4" disabled={!isFormInteractive}>
              <div>
                <h3 className="text-base font-semibold text-text-strong">
                  Seller brief
                </h3>
                <p className="text-sm text-text-muted">
                  Keep the goals specific and the must-haves clear so each
                  offer can be compared like for like.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-text-strong">
                    Seller goals
                  </span>
                  <Textarea
                    required
                    minLength={30}
                    placeholder="Need realistic pricing advice, accompanied viewings, and strong communication through to sale."
                    value={form.sellerGoals}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sellerGoals: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Target timeline
                  </span>
                  <select
                    className={controlClassName}
                    value={form.targetTimeline}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        targetTimeline: event.target
                          .value as (typeof targetTimelines)[number]
                      }))
                    }
                  >
                    {targetTimelines.map((option) => (
                      <option key={option} value={option}>
                        {targetTimelineLabels[option]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-text-strong">
                    Must-haves, comma-separated
                  </span>
                  <Textarea
                    placeholder="Accompanied viewings, realistic valuation, strong communication"
                    value={form.mustHaves}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        mustHaves: event.target.value
                      }))
                    }
                  />
                  <p className="text-xs text-text-muted">
                    Separate each must-have with a comma.
                  </p>
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-4" disabled={!isFormInteractive}>
              <div>
                <h3 className="text-base font-semibold text-text-strong">
                  Launch bid window
                </h3>
                <p className="text-sm text-text-muted">
                  Choose the window start, end, and duration. The form keeps all
                  three values synchronized for you.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Bid window start
                  </span>
                  <Input
                    required
                    type="datetime-local"
                    value={form.bidWindowStartAt}
                    onChange={(event) => updateStartAt(event.target.value)}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Bid window end
                  </span>
                  <Input
                    required
                    type="datetime-local"
                    value={form.bidWindowEndAt}
                    onChange={(event) => updateEndAt(event.target.value)}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Bid window hours
                  </span>
                  <Input
                    required
                    type="number"
                    min={24}
                    max={48}
                    step={1}
                    value={form.bidWindowHours}
                    onChange={(event) => updateHours(event.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button type="submit" disabled={!isFormInteractive}>
                {submission.kind === "submitting"
                  ? "Submitting..."
                  : "Create instruction"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!isFormInteractive}
                onClick={() => {
                  setForm(createInitialFormState());
                  setSubmission({ kind: "idle" });
                }}
              >
                Reset form
              </Button>
              <p className="text-sm text-text-muted">
                The instruction will appear in your dashboard once it has been
                created.
              </p>
            </div>
          </form>
        </Card>

        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">
              What agents will receive
            </h2>
            <p className="text-sm text-text-muted">
              Every response is anchored to the same instruction structure so
              offers stay easy to compare.
            </p>
          </div>
          <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
            <li>Property details: address, city, postcode, type, rooms, summary.</li>
            <li>Seller brief: goals plus comma-separated must-haves.</li>
            <li>Response window: start, end, and whole-hour duration.</li>
            <li>Comparable offers returned in a consistent structure.</li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
