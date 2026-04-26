"use client";

import Link from "next/link";
import {
  CheckCircle,
  LinkedinLogo,
  Rocket,
  Trophy,
  UploadSimple
} from "@phosphor-icons/react";
import {
  useEffect,
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode
} from "react";
import { useFormStatus } from "react-dom";

import {
  agentFeePreferenceOptions,
  agentTransactionBandOptions,
  collaborationPreferenceOptions,
  responseTimeOptionsWithLabels
} from "@/lib/validation/agent-profile";
import { cn } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;
type EmptyAction = () => void | Promise<void>;
type NoticeTone = "danger" | "warning" | "success";

type FieldKey =
  | "fullName"
  | "workEmail"
  | "phone"
  | "agencyName"
  | "jobTitle"
  | "yearsExperience"
  | "bio"
  | "serviceAreas"
  | "specialties"
  | "achievements"
  | "languages"
  | "feePreference"
  | "transactionBand"
  | "collaborationPreference"
  | "responseTimeMinutes";

type Values = Record<FieldKey, string>;

type ResumeConfidence = Partial<
  Record<
    | "fullName"
    | "workEmail"
    | "phone"
    | "agencyName"
    | "jobTitle"
    | "yearsExperience"
    | "bio"
    | "serviceAreas"
    | "specialties",
    number | undefined
  >
>;

interface AgentOnboardingStepperProps {
  userId: string;
  draftSourceKey: string;
  resumeMode: string;
  formValues: Values;
  resumeConfidence: ResumeConfidence;
  hasResumeSuggestions: boolean;
  workEmailVerified: boolean;
  initialVerificationSent: boolean;
  agentCodePreview: string;
  notice: { tone: NoticeTone; message: string } | null;
  devCode?: string | undefined;
  uploadResumeAction: FormAction;
  clearResumeSuggestionsAction: EmptyAction;
  sendWorkEmailVerificationCodeAction: FormAction;
  confirmWorkEmailVerificationCodeAction: FormAction;
  submitAgentOnboardingAction: FormAction;
}

const totalSteps = 6;
const confidenceThreshold = 0.72;

const coreDetailFields: FieldKey[] = [
  "fullName",
  "workEmail",
  "phone",
  "agencyName",
  "jobTitle",
  "yearsExperience",
  "serviceAreas",
  "specialties"
];

const summaryFields: Array<{ key: FieldKey; label: string }> = [
  { key: "fullName", label: "Full name" },
  { key: "workEmail", label: "Email" },
  { key: "agencyName", label: "Agency" },
  { key: "jobTitle", label: "Job title" },
  { key: "phone", label: "Phone" },
  { key: "yearsExperience", label: "Years experience" },
  { key: "serviceAreas", label: "Service areas" },
  { key: "specialties", label: "Specialties" },
  { key: "bio", label: "Professional summary" }
];

const fieldLabels: Record<FieldKey, string> = {
  fullName: "Full name",
  workEmail: "Email",
  phone: "Phone",
  agencyName: "Agency",
  jobTitle: "Job title",
  yearsExperience: "Years experience",
  bio: "Professional summary",
  serviceAreas: "Service areas",
  specialties: "Specialties",
  achievements: "Recent wins",
  languages: "Languages",
  feePreference: "Fee style",
  transactionBand: "Property value band",
  collaborationPreference: "Collaboration",
  responseTimeMinutes: "Response time"
};

const placeholders: Partial<Record<FieldKey, string>> = {
  fullName: "Your full name",
  workEmail: "name@agency.co.uk",
  phone: "+44 20 7946 0000",
  agencyName: "Example Estates",
  jobTitle: "Senior Sales Negotiator",
  yearsExperience: "8",
  serviceAreas: "SW1A, SE1, E14",
  specialties: "Prime sales, Family homes",
  achievements: "Trusted local adviser, Strong vendor communication",
  languages: "English, French",
  bio: "Describe your market knowledge, communication style, and what homeowners can expect when working with you."
};

const quickQuestions: Array<{
  key: FieldKey;
  label: string;
  helper: string;
}> = [
  {
    key: "bio",
    label: "What should homeowners know about you?",
    helper: "Keep it crisp, credible, and focused on how you work."
  },
  {
    key: "feePreference",
    label: "How do you usually structure your fees?",
    helper: "Choose the style that best matches how you normally work."
  },
  {
    key: "transactionBand",
    label: "What property value band do you usually handle?",
    helper: "This helps frame the kind of instructions that fit you."
  },
  {
    key: "collaborationPreference",
    label: "How open are you to referral-style collaboration?",
    helper: "Set the posture you want WHOMA to show."
  },
  {
    key: "responseTimeMinutes",
    label: "How quickly do you usually respond?",
    helper: "Set an expectation that feels accurate for your rhythm."
  }
];

function hasValue(value: string): boolean {
  return value.trim().length > 0;
}

function fieldIsReady(
  key: FieldKey,
  values: Values,
  confidence: ResumeConfidence,
  hasResumeSuggestions: boolean
): boolean {
  if (!hasValue(values[key])) {
    return false;
  }

  const score = confidence[key as keyof ResumeConfidence];
  if (!hasResumeSuggestions || typeof score !== "number") {
    return true;
  }

  return score >= confidenceThreshold;
}

function displayValue(key: FieldKey, value: string): string {
  if (!value.trim()) {
    return "Not found yet";
  }

  if (key === "specialties") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(", ");
  }

  return value;
}

function StepFrame({
  step,
  label,
  headline,
  subtext,
  children
}: {
  step: number;
  label: string;
  headline: string;
  subtext: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="mb-3 text-xs uppercase tracking-[0.15em] text-zinc-400">
        STEP {step} · {label}
      </p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {headline}
      </h1>
      <p className="mb-8 max-w-[42ch] text-sm leading-relaxed text-zinc-400">
        {subtext}
      </p>
      {children}
    </section>
  );
}

function SubmitButton({
  children,
  pendingText,
  disabled,
  variant = "primary",
  onClick
}: {
  children: ReactNode;
  pendingText?: string;
  disabled?: boolean;
  variant?: "primary" | "outline";
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary"
          ? "bg-[#2d6a5a] text-white"
          : "border border-slate-200 bg-white text-zinc-700"
      )}
    >
      {pending ? (pendingText ?? "Working...") : children}
    </button>
  );
}

function TextLinkButton({
  children,
  onClick
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto block text-sm text-zinc-400 transition-colors hover:text-zinc-700"
    >
      {children}
    </button>
  );
}

function OnboardingField({
  fieldKey,
  value,
  onChange,
  index,
  textareaRows = 3
}: {
  fieldKey: FieldKey;
  value: string;
  onChange: (key: FieldKey, value: string) => void;
  index: number;
  textareaRows?: number;
}) {
  const label = fieldLabels[fieldKey];
  const baseClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 transition-all duration-200 focus:border-[#2d6a5a]/50 focus:outline-none focus:ring-2 focus:ring-[#2d6a5a]/10";

  const style = { "--index": index } as CSSProperties;

  if (fieldKey === "bio") {
    return (
      <div
        className="animate-[field-reveal_220ms_ease-out_both] space-y-1.5"
        style={style}
      >
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </label>
        <textarea
          name={fieldKey}
          value={value}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          placeholder={placeholders[fieldKey]}
          rows={textareaRows}
          className={cn(baseClass, "resize-none")}
        />
      </div>
    );
  }

  const selectOptions =
    fieldKey === "feePreference"
      ? agentFeePreferenceOptions
      : fieldKey === "transactionBand"
        ? agentTransactionBandOptions
        : fieldKey === "collaborationPreference"
          ? collaborationPreferenceOptions
          : fieldKey === "responseTimeMinutes"
            ? responseTimeOptionsWithLabels.map((option) => ({
                value: String(option.value),
                label: option.label
              }))
            : null;

  if (selectOptions) {
    return (
      <div
        className="animate-[field-reveal_220ms_ease-out_both] space-y-1.5"
        style={style}
      >
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </label>
        <select
          name={fieldKey}
          value={value}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          className={cn(baseClass, "appearance-none")}
        >
          <option value="">Select an option</option>
          {selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className="animate-[field-reveal_220ms_ease-out_both] space-y-1.5"
      style={style}
    >
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <input
        name={fieldKey}
        type={fieldKey === "workEmail" ? "email" : fieldKey === "yearsExperience" ? "number" : "text"}
        value={value}
        onChange={(event) => onChange(fieldKey, event.target.value)}
        placeholder={placeholders[fieldKey]}
        min={fieldKey === "yearsExperience" ? 0 : undefined}
        max={fieldKey === "yearsExperience" ? 60 : undefined}
        className={baseClass}
      />
    </div>
  );
}

function HiddenProfileFields({ values }: { values: Values }) {
  return (
    <>
      {(Object.keys(values) as FieldKey[]).map((key) => (
        <input key={key} type="hidden" name={key} value={values[key]} />
      ))}
    </>
  );
}

export function AgentOnboardingStepper({
  userId,
  draftSourceKey,
  resumeMode,
  formValues,
  resumeConfidence,
  hasResumeSuggestions,
  workEmailVerified,
  initialVerificationSent,
  agentCodePreview,
  notice,
  devCode,
  uploadResumeAction,
  clearResumeSuggestionsAction,
  sendWorkEmailVerificationCodeAction,
  confirmWorkEmailVerificationCodeAction,
  submitAgentOnboardingAction
}: AgentOnboardingStepperProps) {
  const storageKey = `whoma-agent-onboarding-step:${userId}`;
  const draftStorageKey = `whoma-agent-onboarding-draft:${userId}`;
  const [currentStep, setCurrentStep] = useState(hasResumeSuggestions ? 2 : 1);
  const [transitionState, setTransitionState] = useState<"idle" | "exit" | "enter">("idle");
  const [importMode, setImportMode] = useState<"file" | "bio">("file");
  const [hasFile, setHasFile] = useState(false);
  const [bioText, setBioText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [values, setValues] = useState<Values>(formValues);
  const [quickIndex, setQuickIndex] = useState(0);
  const [verificationSent, setVerificationSent] = useState(initialVerificationSent);
  const [canResendCode, setCanResendCode] = useState(false);
  const [showConfirmedInterstitial, setShowConfirmedInterstitial] = useState(false);

  const updateValue = (key: FieldKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const confirmationFields = useMemo(
    () =>
      coreDetailFields.filter(
        (key) => !fieldIsReady(key, values, resumeConfidence, hasResumeSuggestions)
      ),
    [hasResumeSuggestions, resumeConfidence, values]
  );

  const detectedCount = summaryFields.filter((field) =>
    hasValue(values[field.key])
  ).length;
  const missingCount = summaryFields.length - detectedCount;

  const setStep = useCallback((nextStep: number) => {
    const safeStep = Math.max(1, Math.min(totalSteps, nextStep));
    if (safeStep === currentStep) {
      return;
    }

    setTransitionState("exit");
    window.setTimeout(() => {
      setCurrentStep(safeStep);
      localStorage.setItem(storageKey, String(safeStep));
      setTransitionState("enter");
      window.setTimeout(() => setTransitionState("idle"), 260);
    }, 180);
  }, [currentStep, storageKey]);

  useEffect(() => {
    const savedStep = Number(localStorage.getItem(storageKey));
    if (hasResumeSuggestions) {
      setCurrentStep(2);
      localStorage.setItem(storageKey, "2");
      return;
    }

    if (Number.isInteger(savedStep) && savedStep >= 1 && savedStep <= totalSteps) {
      setCurrentStep(savedStep);
    }
  }, [hasResumeSuggestions, storageKey]);

  useEffect(() => {
    const savedDraft = localStorage.getItem(draftStorageKey);
    if (!savedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as {
        draftSourceKey?: string;
        values?: Partial<Values>;
      };
      if (parsed.draftSourceKey !== draftSourceKey || !parsed.values) {
        localStorage.removeItem(draftStorageKey);
        return;
      }

      setValues((current) => ({ ...current, ...parsed.values }));
    } catch {
      localStorage.removeItem(draftStorageKey);
    }
  }, [draftSourceKey, draftStorageKey]);

  useEffect(() => {
    localStorage.setItem(
      draftStorageKey,
      JSON.stringify({ draftSourceKey, values })
    );
  }, [draftSourceKey, draftStorageKey, values]);

  useEffect(() => {
    if (currentStep !== 3 || confirmationFields.length > 0) {
      return;
    }

    setShowConfirmedInterstitial(true);
    const timer = window.setTimeout(() => {
      setShowConfirmedInterstitial(false);
      setStep(4);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [confirmationFields.length, currentStep, setStep]);

  useEffect(() => {
    if (currentStep !== 5 || !workEmailVerified) {
      return;
    }

    const timer = window.setTimeout(() => setStep(6), 1500);
    return () => window.clearTimeout(timer);
  }, [currentStep, setStep, workEmailVerified]);

  useEffect(() => {
    if (!verificationSent || workEmailVerified) {
      setCanResendCode(false);
      return;
    }

    const timer = window.setTimeout(() => setCanResendCode(true), 30000);
    return () => window.clearTimeout(timer);
  }, [verificationSent, workEmailVerified]);

  const contentClass = cn(
    "mx-auto max-w-lg px-6 pb-16 pt-24 transition-all md:px-6",
    transitionState === "exit" && "translate-x-[-16px] opacity-0 duration-[180ms]",
    transitionState === "enter" && "translate-x-0 opacity-100 duration-[250ms]",
    transitionState === "idle" && "translate-x-0 opacity-100"
  );

  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <main className="min-h-[100dvh] bg-[#f4f4f2] text-zinc-900">
      <style jsx global>{`
        @keyframes field-reveal {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        [style*="--index"] {
          animation-delay: calc(var(--index) * 50ms);
        }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-20 h-14 border-b border-zinc-200/80 bg-[#f4f4f2]/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4 md:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-zinc-900">WHOMA</p>
            <p className="truncate text-[11px] text-zinc-400">Where Home Owners Meet Agents</p>
          </div>
          <p className="text-sm text-zinc-400">Step {currentStep} of {totalSteps}</p>
        </div>
        <div className="h-px w-full bg-zinc-200">
          <div
            className="h-px bg-[#2d6a5a] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <div className={contentClass}>
        {notice ? (
          <div
            className={cn(
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              notice.tone === "success" && "border-[#2d6a5a]/20 bg-[#2d6a5a]/5 text-[#2d6a5a]",
              notice.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
              notice.tone === "danger" && "border-red-200 bg-red-50 text-red-500"
            )}
          >
            {notice.message}
          </div>
        ) : null}

        {currentStep === 1 ? (
          <StepFrame
            step={1}
            label="IMPORT"
            headline="Let's start with what you've already got."
            subtext="Upload your CV or paste your LinkedIn bio. We'll build the first draft — you just confirm."
          >
            <form action={uploadResumeAction} className="space-y-5">
              <input type="hidden" name="mode" value={resumeMode} />
              <div
                className={cn(
                  "w-full cursor-pointer rounded-2xl border bg-white p-5 text-left transition-all duration-200 active:scale-[0.98]",
                  importMode === "file" ? "border-[#2d6a5a] bg-[#2d6a5a]/5" : "border-slate-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => setImportMode("file")}
                  className="flex w-full gap-3 text-left"
                >
                  <UploadSimple size={20} className="mt-0.5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Upload CV or resume</p>
                    <p className="text-xs text-zinc-400">PDF, Word, or text file</p>
                  </div>
                </button>
                {importMode === "file" ? (
                  <div className="mt-4 translate-y-0 opacity-100 transition-all duration-200">
                    <input
                      name="resumeFile"
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.markdown,.rtf,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/rtf,application/rtf,image/png,image/jpeg,image/webp"
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setHasFile(Boolean(event.target.files?.length))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:text-zinc-700"
                    />
                    <input
                      name="linkedinUrl"
                      type="url"
                      value={linkedinUrl}
                      onChange={(event) => setLinkedinUrl(event.target.value)}
                      placeholder="LinkedIn URL (optional)"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:border-[#2d6a5a]/50 focus:outline-none focus:ring-2 focus:ring-[#2d6a5a]/10"
                    />
                  </div>
                ) : null}
              </div>

              <div
                className={cn(
                  "w-full cursor-pointer rounded-2xl border bg-white p-5 text-left transition-all duration-200 active:scale-[0.98]",
                  importMode === "bio" ? "border-[#2d6a5a] bg-[#2d6a5a]/5" : "border-slate-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => setImportMode("bio")}
                  className="flex w-full gap-3 text-left"
                >
                  <LinkedinLogo size={20} className="mt-0.5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Paste your LinkedIn About section</p>
                    <p className="text-xs text-zinc-400">Professional bio or public summary</p>
                  </div>
                </button>
                {importMode === "bio" ? (
                  <div className="mt-4 translate-y-0 opacity-100 transition-all duration-200">
                    <textarea
                      name="bioText"
                      rows={5}
                      value={bioText}
                      onChange={(event) => setBioText(event.target.value)}
                      placeholder="Paste your LinkedIn About section or a polished professional bio."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:border-[#2d6a5a]/50 focus:outline-none focus:ring-2 focus:ring-[#2d6a5a]/10"
                    />
                    <input
                      name="linkedinUrl"
                      type="url"
                      value={linkedinUrl}
                      onChange={(event) => setLinkedinUrl(event.target.value)}
                      placeholder="LinkedIn URL (optional)"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:border-[#2d6a5a]/50 focus:outline-none focus:ring-2 focus:ring-[#2d6a5a]/10"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <span className="h-px flex-1 bg-zinc-200" />
                or
                <span className="h-px flex-1 bg-zinc-200" />
              </div>

              <SubmitButton
                pendingText="Building your draft..."
                disabled={importMode === "file" ? !hasFile : !hasValue(bioText)}
              >
                Build my draft
              </SubmitButton>
              <TextLinkButton onClick={() => setStep(3)}>
                Skip — I&apos;ll fill it in manually →
              </TextLinkButton>
            </form>
          </StepFrame>
        ) : null}

        {currentStep === 2 ? (
          <StepFrame
            step={2}
            label="DRAFT PREVIEW"
            headline="Here's what we pulled from your CV."
            subtext="Check what looks right. You'll fix anything missing in the next step."
          >
            <p className="mb-4 text-sm text-zinc-500">
              {detectedCount} fields detected · {missingCount} still needed
            </p>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-6">
              {summaryFields.map((field) => {
                const ready = hasValue(values[field.key]);
                return (
                  <div key={field.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">{field.label}</p>
                      <p className={cn("mt-1 text-sm font-medium text-zinc-800", field.key === "bio" && "line-clamp-2")}>
                        {displayValue(field.key, values[field.key])}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs",
                        ready ? "bg-[#2d6a5a]/10 text-[#2d6a5a]" : "bg-zinc-100 text-zinc-400"
                      )}
                    >
                      {ready ? "Ready" : "Missing"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full rounded-xl bg-[#2d6a5a] py-3 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
              >
                Looks good, continue →
              </button>
              <form action={clearResumeSuggestionsAction}>
                <button type="submit" className="mx-auto block text-sm text-zinc-400 transition-colors hover:text-zinc-700">
                  Re-import CV
                </button>
              </form>
            </div>
          </StepFrame>
        ) : null}

        {currentStep === 3 ? (
          <StepFrame
            step={3}
            label="CONFIRM DETAILS"
            headline="Fill in what's missing."
            subtext={`We only ask for what we couldn't find. ${confirmationFields.length} fields to complete.`}
          >
            {showConfirmedInterstitial ? (
              <div className="rounded-2xl border border-[#2d6a5a]/10 bg-white p-6 text-center">
                <CheckCircle size={32} className="mx-auto mb-3 text-[#2d6a5a]" />
                <p className="text-lg font-semibold text-zinc-800">All details confirmed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmationFields.map((fieldKey, index) => (
                  <OnboardingField
                    key={fieldKey}
                    fieldKey={fieldKey}
                    value={values[fieldKey]}
                    onChange={updateValue}
                    index={index}
                  />
                ))}
                <div className="pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="w-full rounded-xl bg-[#2d6a5a] py-3 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
                  >
                    Save details →
                  </button>
                  <TextLinkButton onClick={() => setStep(2)}>← Back</TextLinkButton>
                </div>
              </div>
            )}
          </StepFrame>
        ) : null}

        {currentStep === 4 ? (
          <StepFrame
            step={4}
            label="QUICK INTERVIEW"
            headline="Three quick questions."
            subtext="These shape how your profile reads to homeowners."
          >
            <div className="mb-6 flex gap-2">
              {quickQuestions.map((question, index) => (
                <span
                  key={question.key}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    index === quickIndex ? "bg-zinc-900" : "bg-zinc-200"
                  )}
                />
              ))}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6">
              <p className="mb-1 text-lg font-semibold text-zinc-900">
                {quickQuestions[quickIndex]?.label}
              </p>
              <p className="mb-5 text-sm text-zinc-400">
                {quickQuestions[quickIndex]?.helper}
              </p>
              {quickQuestions[quickIndex] ? (
                <OnboardingField
                  fieldKey={quickQuestions[quickIndex].key}
                  value={values[quickQuestions[quickIndex].key]}
                  onChange={updateValue}
                  index={0}
                  textareaRows={5}
                />
              ) : null}
            </div>
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (quickIndex >= quickQuestions.length - 1) {
                    setStep(5);
                    return;
                  }
                  setQuickIndex((index) => index + 1);
                }}
                className="w-full rounded-xl bg-[#2d6a5a] py-3 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
              >
                {quickIndex >= quickQuestions.length - 1 ? "Done →" : "Next →"}
              </button>
              <TextLinkButton
                onClick={() => {
                  if (quickIndex === 0) {
                    setStep(3);
                    return;
                  }
                  setQuickIndex((index) => index - 1);
                }}
              >
                ← Back
              </TextLinkButton>
            </div>
          </StepFrame>
        ) : null}

        {currentStep === 5 ? (
          <StepFrame
            step={5}
            label="VERIFY EMAIL"
            headline="One last security check."
            subtext="We send a 6-digit code to confirm your contact channel."
          >
            {workEmailVerified ? (
              <div className="rounded-2xl border border-[#2d6a5a]/10 bg-white p-6 text-center">
                <CheckCircle size={32} className="mx-auto mb-3 text-[#2d6a5a]" />
                <p className="text-lg font-semibold text-zinc-800">Email verified</p>
              </div>
            ) : (
              <form action={sendWorkEmailVerificationCodeAction} className="space-y-4">
                <div className="rounded-xl bg-zinc-100 px-4 py-3 font-mono text-sm text-zinc-600">
                  {values.workEmail || "Add your email in step 3"}
                </div>
                <input type="hidden" name="workEmail" value={values.workEmail} />
                <SubmitButton
                  variant="outline"
                  pendingText="Sending code..."
                  onClick={() => setVerificationSent(true)}
                >
                  Send code
                </SubmitButton>
              </form>
            )}

            {!workEmailVerified && verificationSent ? (
              <form action={confirmWorkEmailVerificationCodeAction} className="mt-5 space-y-4">
                <input type="hidden" name="workEmail" value={values.workEmail} />
                <input
                  name="verificationCode"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="123456"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-zinc-800 placeholder:text-zinc-300 focus:border-[#2d6a5a]/50 focus:outline-none focus:ring-2 focus:ring-[#2d6a5a]/10"
                />
                <SubmitButton pendingText="Verifying...">
                  Verify code
                </SubmitButton>
              </form>
            ) : null}

            {!workEmailVerified && verificationSent && canResendCode ? (
              <form action={sendWorkEmailVerificationCodeAction} className="mt-4">
                <input type="hidden" name="workEmail" value={values.workEmail} />
                <button
                  type="submit"
                  className="mx-auto block text-sm text-zinc-400 transition-colors hover:text-zinc-700"
                >
                  Resend code
                </button>
              </form>
            ) : null}

            {devCode ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Dev verification code: {devCode}
              </p>
            ) : null}

            {!workEmailVerified ? (
              <TextLinkButton onClick={() => setStep(4)}>← Back</TextLinkButton>
            ) : null}
          </StepFrame>
        ) : null}

        {currentStep === 6 ? (
          <StepFrame
            step={6}
            label="DONE"
            headline="Your profile is ready."
            subtext="You can publish now or log your first past deal to boost credibility before going live."
          >
            <form action={submitAgentOnboardingAction} className="space-y-6">
              <HiddenProfileFields values={values} />
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="submit"
                  className="rounded-2xl bg-[#2d6a5a] p-6 text-left text-white transition-all duration-200 active:scale-[0.98]"
                >
                  <Rocket size={24} className="mb-4" />
                  <p className="font-semibold">Publish now</p>
                  <p className="mt-1 text-sm opacity-80">Go live and start building trust.</p>
                </button>
                <Link
                  href="/agent/deals"
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all duration-200 hover:border-zinc-300 active:scale-[0.98]"
                >
                  <Trophy size={24} className="mb-4 text-[#2d6a5a]" />
                  <p className="font-semibold text-zinc-800">Add a past deal</p>
                  <p className="mt-1 text-sm text-zinc-400">Verified deals build credibility faster.</p>
                </Link>
              </div>
            </form>
            <div className="mt-8">
              <p className="mb-2 text-xs text-zinc-400">Your agent code</p>
              <span className="rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-sm text-zinc-600">
                {agentCodePreview}
              </span>
            </div>
          </StepFrame>
        ) : null}
      </div>
    </main>
  );
}
