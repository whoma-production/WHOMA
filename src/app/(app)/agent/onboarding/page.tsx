import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ActivationChecklist } from "@/components/agent/activation-checklist";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MIN_AGENT_PUBLISH_COMPLETENESS } from "@/lib/agent-activation";
import { assertCan } from "@/lib/auth/rbac";
import {
  agentFeePreferenceOptions,
  agentOnboardingSchema,
  agentTransactionBandOptions,
  agentWorkEmailVerificationConfirmSchema,
  agentWorkEmailVerificationSendSchema,
  collaborationPreferenceOptions,
  parseCsvList
} from "@/lib/validation/agent-profile";
import { cn } from "@/lib/utils";
import { createResumeSuggestionsFromFile } from "@/server/agent-profile/resume-ai";
import { getResumeFeatureFlags } from "@/server/agent-profile/resume-flags";
import { ResumeExtractionError } from "@/server/agent-profile/resume-intake";
import {
  decodeResumeSuggestionsCookie,
  encodeResumeSuggestionsCookie,
  RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS,
  RESUME_SUGGESTIONS_COOKIE_NAME,
  type ResumePrefillValues,
  type ResumeSuggestions
} from "@/server/agent-profile/resume-suggestions-cookie";
import {
  calculateAgentProfileCompleteness,
  WorkEmailVerificationError,
  completeAgentOnboarding,
  confirmAgentWorkEmailVerificationCode,
  getAgentProfileByUserId,
  isAgentWorkEmailVerified,
  requestAgentWorkEmailVerificationCode
} from "@/server/agent-profile/service";
import {
  checkRateLimit,
  clientIpFromRequestHeaders
} from "@/server/http/rate-limit";

interface PageProps {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    devCode?: string;
    retryAfter?: string;
  }>;
}

function mapWorkEmailVerificationErrorToQuery(
  error: WorkEmailVerificationError
): string {
  switch (error.code) {
    case "CODE_NOT_REQUESTED":
      return "work_email_code_not_requested";
    case "CODE_EXPIRED":
      return "work_email_code_expired";
    case "CODE_INVALID":
      return "work_email_code_invalid";
    case "EMAIL_MISMATCH":
      return "work_email_code_email_mismatch";
    case "EMAIL_NOT_VERIFIED":
      return "work_email_unverified";
    case "RESEND_COOLDOWN":
      return "work_email_resend_cooldown";
    case "ATTEMPTS_EXCEEDED":
      return "work_email_attempts_exceeded";
    case "EMAIL_DELIVERY_UNAVAILABLE":
      return "work_email_delivery_unavailable";
    default:
      return "work_email_code_invalid";
  }
}

function mapResumeUploadErrorToQuery(error: ResumeExtractionError): string {
  switch (error.code) {
    case "FILE_MISSING":
      return "resume_input_missing";
    case "FILE_EMPTY":
      return "resume_file_empty";
    case "FILE_TOO_LARGE":
      return "resume_file_too_large";
    case "UNSUPPORTED_TYPE":
      return "resume_file_unsupported";
    case "PARSE_FAILED":
      return "resume_file_parse_failed";
    case "TEXT_TOO_SHORT":
      return "resume_file_text_short";
    case "NO_SUGGESTIONS":
      return "resume_file_no_suggestions";
    case "LLM_UNAVAILABLE":
      return "resume_llm_unavailable";
    case "OCR_UNAVAILABLE":
      return "resume_ocr_unavailable";
    default:
      return "resume_file_parse_failed";
  }
}

function getRetryAfterSeconds(details: unknown): number | null {
  if (typeof details !== "object" || details === null) {
    return null;
  }

  const maybeRetryAfter = (details as { retryAfterSeconds?: unknown })
    .retryAfterSeconds;
  if (
    typeof maybeRetryAfter === "number" &&
    Number.isFinite(maybeRetryAfter) &&
    maybeRetryAfter > 0
  ) {
    return Math.ceil(maybeRetryAfter);
  }

  return null;
}

function formatCsvDefault(values?: string[] | null): string {
  return values?.length ? values.join(", ") : "";
}

type NoticeTone = "danger" | "warning" | "success";

interface NoticeMessage {
  tone: NoticeTone;
  message: string;
}

const noticeToneClasses: Record<NoticeTone, string> = {
  danger: "border-state-danger/20 bg-state-danger/10 text-state-danger",
  warning: "border-state-warning/20 bg-state-warning/10 text-state-warning",
  success: "border-state-success/20 bg-state-success/10 text-state-success"
};

const selectClasses =
  "flex h-10 w-full rounded-md border border-line bg-surface-0 px-3 py-2 text-sm text-text-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:cursor-not-allowed disabled:opacity-50";

const feePreferenceLabels = {
  FIXED_FEE: "Fixed fee",
  PERCENTAGE: "Percentage",
  HYBRID: "Hybrid",
  CASE_BY_CASE: "Case by case"
} as const;

const transactionBandLabels = {
  UNDER_250K: "Under £250k",
  FROM_250K_TO_500K: "£250k–£500k",
  FROM_500K_TO_1M: "£500k–£1m",
  FROM_1M_TO_2M: "£1m–£2m",
  OVER_2M: "Over £2m"
} as const;

const collaborationPreferenceLabels = {
  JV_OR_REFERRALS: "Open to JV + referrals",
  REFERRALS_ONLY: "Referrals only",
  SELECTIVE: "Selective / case by case",
  NOT_OPEN: "Not currently looking"
} as const;

const responseTimeLabels = {
  15: "Within 15 minutes",
  60: "Within 1 hour",
  180: "Within 3 hours",
  480: "Within 8 hours",
  1440: "Within 24 hours"
} as const;

type ResumeFieldKey = keyof ResumePrefillValues;

type OnboardingFormFieldKey =
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

const resumeFieldLabels: Record<ResumeFieldKey, string> = {
  fullName: "Name",
  workEmail: "Email",
  phone: "Phone",
  agencyName: "Agency",
  jobTitle: "Role",
  yearsExperience: "Experience",
  bio: "Professional summary",
  serviceAreas: "Service areas",
  specialties: "Specialties"
};

const formFieldLabels: Record<OnboardingFormFieldKey, string> = {
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
  transactionBand: "Typical transaction band",
  collaborationPreference: "Collaboration posture",
  responseTimeMinutes: "Response time"
};

const coreFieldOrder: OnboardingFormFieldKey[] = [
  "fullName",
  "workEmail",
  "phone",
  "agencyName",
  "jobTitle",
  "yearsExperience",
  "serviceAreas",
  "specialties",
  "bio"
];

const allFieldOrder: OnboardingFormFieldKey[] = [
  ...coreFieldOrder,
  "achievements",
  "languages",
  "feePreference",
  "transactionBand",
  "collaborationPreference",
  "responseTimeMinutes"
];

interface SelectQuestionOption {
  value: string;
  label: string;
}

interface QuickInterviewQuestion {
  key: OnboardingFormFieldKey;
  label: string;
  prompt: string;
  hint: string;
  required: boolean;
  inputType: "text" | "email" | "number" | "textarea" | "select";
  placeholder: string;
  rows?: number;
  options?: SelectQuestionOption[];
  evidence?: string;
  confidence?: number;
}

const quickInterviewPriority: Record<OnboardingFormFieldKey, number> = {
  fullName: 0,
  workEmail: 1,
  serviceAreas: 2,
  specialties: 3,
  bio: 4,
  feePreference: 5,
  transactionBand: 6,
  collaborationPreference: 7,
  responseTimeMinutes: 8,
  yearsExperience: 9,
  agencyName: 10,
  jobTitle: 11,
  phone: 12,
  achievements: 13,
  languages: 14
};

function hasFieldValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return Boolean(value);
}

function resolveNoticeMessage(params: {
  error: string | undefined;
  success: string | undefined;
  retryAfterSeconds: number | null;
}): NoticeMessage | null {
  const retrySuffix = params.retryAfterSeconds
    ? ` Please retry in about ${params.retryAfterSeconds} seconds.`
    : " Please retry shortly.";

  if (params.error === "invalid_fields") {
    return {
      tone: "danger",
      message:
        "Please review your details. Use postcode districts like SW1A and add clear professional information."
    };
  }

  if (params.error === "resume_file_missing") {
    return {
      tone: "warning",
      message: "Choose a CV or resume file before uploading."
    };
  }

  if (params.error === "resume_input_missing") {
    return {
      tone: "warning",
      message: "Upload a CV/resume or paste a professional bio to continue."
    };
  }

  if (params.error === "resume_file_empty") {
    return { tone: "danger", message: "The uploaded file was empty." };
  }

  if (params.error === "resume_file_too_large") {
    return {
      tone: "danger",
      message: "CV and resume files must be 4 MB or smaller."
    };
  }

  if (params.error === "resume_file_unsupported") {
    return {
      tone: "danger",
      message: "Upload a PDF, DOCX, TXT, MD, RTF, PNG, JPG, or WEBP file."
    };
  }

  if (params.error === "resume_file_parse_failed") {
    return {
      tone: "danger",
      message:
        "We could not read that document. Try a different export or format."
    };
  }

  if (params.error === "resume_file_text_short") {
    return {
      tone: "warning",
      message:
        "We extracted too little text to build useful profile suggestions."
    };
  }

  if (params.error === "resume_file_no_suggestions") {
    return {
      tone: "warning",
      message:
        "We read your document but could not confidently map profile fields yet."
    };
  }

  if (params.error === "resume_llm_unavailable") {
    return {
      tone: "warning",
      message:
        "AI extraction is temporarily unavailable. We will continue with deterministic parsing."
    };
  }

  if (params.error === "resume_ocr_unavailable") {
    return {
      tone: "warning",
      message:
        "OCR fallback is unavailable right now. Try a text-based PDF or DOCX export."
    };
  }

  if (params.error === "resume_upload_rate_limited") {
    return {
      tone: "warning",
      message: `Too many resume uploads from your session.${retrySuffix}`
    };
  }

  if (params.error === "complete_onboarding_first") {
    return {
      tone: "warning",
      message: "Complete onboarding before opening your profile editor."
    };
  }

  if (params.error === "work_email_invalid") {
    return {
      tone: "danger",
      message:
        "Enter a valid email address before requesting a verification code."
    };
  }

  if (params.error === "work_email_unverified") {
    return {
      tone: "warning",
      message: "Verify your email before completing onboarding."
    };
  }

  if (params.error === "work_email_code_send_failed") {
    return {
      tone: "danger",
      message:
        "We could not send a verification code right now. Please try again."
    };
  }

  if (params.error === "work_email_delivery_unavailable") {
    return {
      tone: "danger",
      message:
        "Verification email delivery is temporarily unavailable. Please try again shortly."
    };
  }

  if (params.error === "work_email_code_not_requested") {
    return {
      tone: "warning",
      message: "Request a verification code before trying to verify your email."
    };
  }

  if (params.error === "work_email_code_expired") {
    return {
      tone: "warning",
      message:
        "Your verification code expired. Request a new code and try again."
    };
  }

  if (params.error === "work_email_code_invalid") {
    return {
      tone: "danger",
      message:
        "The verification code is invalid. Enter the latest 6-digit code sent to your email."
    };
  }

  if (params.error === "work_email_code_email_mismatch") {
    return {
      tone: "warning",
      message:
        "That code was requested for a different email. Use the same email for send and verify."
    };
  }

  if (params.error === "work_email_resend_cooldown") {
    return {
      tone: "warning",
      message: `Please wait before requesting another code.${params.retryAfterSeconds ? ` Try again in about ${params.retryAfterSeconds} seconds.` : ""}`
    };
  }

  if (params.error === "work_email_attempts_exceeded") {
    return {
      tone: "danger",
      message:
        "Too many incorrect verification attempts. Request a new code after the lock period."
    };
  }

  if (params.error === "work_email_rate_limited") {
    return {
      tone: "warning",
      message: `Too many verification requests from your session.${retrySuffix}`
    };
  }

  if (params.success === "work_email_code_sent") {
    return {
      tone: "success",
      message:
        "Verification code sent. Enter the 6-digit code to verify your email."
    };
  }

  if (params.success === "work_email_verified") {
    return {
      tone: "success",
      message:
        "Email verified. You can now complete onboarding and publish when ready."
    };
  }

  if (params.success === "resume_prefilled") {
    return {
      tone: "success",
      message:
        "Profile draft created from your document. Review and confirm the suggested details."
    };
  }

  if (params.success === "resume_prefill_cleared") {
    return { tone: "success", message: "Resume suggestions cleared." };
  }

  return null;
}

function mapProfileNeedFieldToFormField(
  field: string
): OnboardingFormFieldKey | null {
  switch (field) {
    case "full_name":
      return "fullName";
    case "email":
      return "workEmail";
    case "phone":
      return "phone";
    case "agency":
      return "agencyName";
    case "job_title":
      return "jobTitle";
    case "service_areas":
      return "serviceAreas";
    case "specialties":
      return "specialties";
    case "professional_summary":
      return "bio";
    default:
      return null;
  }
}

function buildQuestionTemplate(
  key: OnboardingFormFieldKey
): Omit<QuickInterviewQuestion, "prompt" | "hint" | "evidence" | "confidence"> {
  switch (key) {
    case "fullName":
      return {
        key,
        label: "Full name",
        required: true,
        inputType: "text",
        placeholder: "Your full name"
      };
    case "workEmail":
      return {
        key,
        label: "Email",
        required: true,
        inputType: "email",
        placeholder: "name@agency.co.uk"
      };
    case "phone":
      return {
        key,
        label: "Phone",
        required: true,
        inputType: "text",
        placeholder: "+44 20 7946 0000"
      };
    case "agencyName":
      return {
        key,
        label: "Agency",
        required: true,
        inputType: "text",
        placeholder: "Example Estates"
      };
    case "jobTitle":
      return {
        key,
        label: "Job title",
        required: true,
        inputType: "text",
        placeholder: "Senior Sales Negotiator"
      };
    case "yearsExperience":
      return {
        key,
        label: "Years experience",
        required: true,
        inputType: "number",
        placeholder: "8"
      };
    case "serviceAreas":
      return {
        key,
        label: "Service areas",
        required: true,
        inputType: "text",
        placeholder: "SW1A, SE1, E14"
      };
    case "specialties":
      return {
        key,
        label: "Specialties",
        required: true,
        inputType: "text",
        placeholder: "Prime sales, Family homes, Investment sales"
      };
    case "bio":
      return {
        key,
        label: "Professional summary",
        required: true,
        inputType: "textarea",
        placeholder:
          "Describe your market knowledge, communication style, and what homeowners can expect when working with you.",
        rows: 5
      };
    case "achievements":
      return {
        key,
        label: "Recent wins",
        required: false,
        inputType: "text",
        placeholder: "Trusted local adviser, Strong vendor communication"
      };
    case "languages":
      return {
        key,
        label: "Languages",
        required: false,
        inputType: "text",
        placeholder: "English, French, Arabic"
      };
    case "feePreference":
      return {
        key,
        label: "Fee style",
        required: false,
        inputType: "select",
        placeholder: "",
        options: agentFeePreferenceOptions.map((option) => ({
          value: option.value,
          label: option.label
        }))
      };
    case "transactionBand":
      return {
        key,
        label: "Typical transaction band",
        required: false,
        inputType: "select",
        placeholder: "",
        options: agentTransactionBandOptions.map((option) => ({
          value: option.value,
          label: option.label
        }))
      };
    case "collaborationPreference":
      return {
        key,
        label: "Collaboration posture",
        required: false,
        inputType: "select",
        placeholder: "",
        options: collaborationPreferenceOptions.map((option) => ({
          value: option.value,
          label: option.label
        }))
      };
    case "responseTimeMinutes":
      return {
        key,
        label: "Response time",
        required: false,
        inputType: "select",
        placeholder: "",
        options: [
          { value: "15", label: "Within 15 minutes" },
          { value: "60", label: "Within 1 hour" },
          { value: "180", label: "Within 3 hours" },
          { value: "480", label: "Within 8 hours" },
          { value: "1440", label: "Within 24 hours" }
        ]
      };
  }
}

function createQuestion(
  key: OnboardingFormFieldKey,
  prompt: string,
  hint: string,
  extras?: Partial<Pick<QuickInterviewQuestion, "evidence" | "confidence">>
): QuickInterviewQuestion {
  return {
    ...buildQuestionTemplate(key),
    prompt,
    hint,
    ...extras
  };
}

function buildQuickInterviewQuestions(params: {
  missingRequiredKeys: OnboardingFormFieldKey[];
  lowConfidenceFields: Array<{
    key: ResumeFieldKey;
    label: string;
    score: number;
    evidence?: string;
  }>;
  needsConfirmationByKey: Partial<Record<OnboardingFormFieldKey, string>>;
  missingStructuredSignals: OnboardingFormFieldKey[];
}): QuickInterviewQuestion[] {
  const questions: QuickInterviewQuestion[] = [];
  const seen = new Set<OnboardingFormFieldKey>();
  const missingRequiredSet = new Set(params.missingRequiredKeys);
  const missingStructuredSet = new Set(params.missingStructuredSignals);
  const prioritizedMissingKeys = [
    ...new Set([
      ...params.missingRequiredKeys,
      ...params.missingStructuredSignals
    ])
  ].sort(
    (left, right) => quickInterviewPriority[left] - quickInterviewPriority[right]
  );

  const addQuestion = (question: QuickInterviewQuestion): void => {
    if (seen.has(question.key) || questions.length >= 7) {
      return;
    }

    seen.add(question.key);
    questions.push(question);
  };

  for (const key of prioritizedMissingKeys) {
    if (missingStructuredSet.has(key)) {
      switch (key) {
        case "feePreference":
          addQuestion(
            createQuestion(
              key,
              "How do you usually structure your fees?",
              "Choose the fee style that best matches how you normally work."
            )
          );
          break;
        case "transactionBand":
          addQuestion(
            createQuestion(
              key,
              "What is your typical property value band?",
              "This helps WHOMA frame your profile around the transactions you usually handle."
            )
          );
          break;
        case "collaborationPreference":
          addQuestion(
            createQuestion(
              key,
              "How open are you to JV or referral-style collaborations?",
              "Pick the posture that best reflects how you want collaboration opportunities to come through."
            )
          );
          break;
        case "responseTimeMinutes":
          addQuestion(
            createQuestion(
              key,
              "How quickly do you usually respond to new leads?",
              "Set an expectation that feels accurate for your working rhythm."
            )
          );
          break;
        default:
          break;
      }

      continue;
    }

    if (!missingRequiredSet.has(key)) {
      continue;
    }

    const confirmationHint = params.needsConfirmationByKey[key];

    switch (key) {
      case "serviceAreas":
        addQuestion(
          createQuestion(
            key,
            "Which postcode districts do you actively cover?",
            confirmationHint ??
              "List the areas you want WHOMA to show on your public profile."
          )
        );
        break;
      case "specialties":
        addQuestion(
          createQuestion(
            key,
            "Which specialties should we show on your profile?",
            confirmationHint ??
              "Use short, comparable specialties separated by commas."
          )
        );
        break;
      case "bio":
        addQuestion(
          createQuestion(
            key,
            "Write the short summary homeowners should read first.",
            confirmationHint ??
              "Keep it crisp, credible, and focused on how you work."
          )
        );
        break;
      case "yearsExperience":
        addQuestion(
          createQuestion(
            key,
            "How many years of estate agency experience should we show?",
            "Use a whole number so the profile reads cleanly."
          )
        );
        break;
      default:
        addQuestion(
          createQuestion(
            key,
            `Fill in your ${formFieldLabels[key].toLowerCase()} so we can complete the draft.`,
            confirmationHint ??
              "We only ask for details that are still missing from your draft."
          )
        );
        break;
    }
  }

  for (const field of params.lowConfidenceFields) {
    const key = field.key as OnboardingFormFieldKey;
    if (!coreFieldOrder.includes(key)) {
      continue;
    }

    const hint =
      params.needsConfirmationByKey[key] ??
      "Keep it if it looks right, or adjust it here.";
    addQuestion(
      createQuestion(
        key,
        `We detected your ${field.label.toLowerCase()}. Please confirm or adjust it.`,
        hint,
        {
          ...(field.evidence ? { evidence: field.evidence } : {}),
          confidence: field.score
        }
      )
    );
  }

  return questions;
}

function renderFieldControl(
  key: OnboardingFormFieldKey,
  value: string
): JSX.Element {
  const label = formFieldLabels[key];
  const template = buildQuestionTemplate(key);

  if (template.inputType === "textarea") {
    return (
      <label className="space-y-1" key={key}>
        <span className="text-sm font-medium text-text-strong">{label}</span>
        <Textarea
          name={key}
          required={template.required}
          defaultValue={value}
          placeholder={template.placeholder}
          rows={template.rows}
        />
      </label>
    );
  }

  if (template.inputType === "select") {
    return (
      <label className="space-y-1" key={key}>
        <span className="text-sm font-medium text-text-strong">{label}</span>
        <select
          name={key}
          required={template.required}
          defaultValue={value}
          className={selectClasses}
        >
          <option value="">Select an option</option>
          {template.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="space-y-1" key={key}>
      <span className="text-sm font-medium text-text-strong">{label}</span>
      <Input
        name={key}
        type={template.inputType}
        required={template.required}
        defaultValue={value}
        placeholder={template.placeholder}
        {...(key === "yearsExperience" ? { min: 0, max: 60 } : {})}
      />
    </label>
  );
}

function createStepState(params: {
  resumeSuggestions: ResumeSuggestions | null;
  readyFieldsCount: number;
  missingRequiredFieldsCount: number;
  lowConfidenceFieldsCount: number;
  workEmailVerified: boolean;
  publishReady: boolean;
  quickInterviewQuestionCount: number;
}): Array<{
  id: string;
  title: string;
  description: string;
  done: boolean;
  current: boolean;
}> {
  return [
    {
      id: "import",
      title: "Import",
      description: "Upload a CV, resume, or LinkedIn summary.",
      done: Boolean(params.resumeSuggestions),
      current: !params.resumeSuggestions
    },
    {
      id: "draft-preview",
      title: "Draft preview",
      description: "See the profile draft WHOMA assembled for you.",
      done: params.readyFieldsCount > 0,
      current: params.readyFieldsCount > 0
    },
    {
      id: "confirm-details",
      title: "Confirm details",
      description: "Keep what looks right and spot what needs review.",
      done:
        params.missingRequiredFieldsCount === 0 &&
        params.lowConfidenceFieldsCount === 0,
      current:
        params.missingRequiredFieldsCount > 0 ||
        params.lowConfidenceFieldsCount > 0
    },
    {
      id: "quick-interview",
      title: "Quick interview",
      description: "Answer only the missing or uncertain bits.",
      done: params.quickInterviewQuestionCount === 0,
      current: params.quickInterviewQuestionCount > 0
    },
    {
      id: "verification-gate",
      title: "Verify email",
      description: "Quietly clear the publish gate.",
      done: params.workEmailVerified,
      current: !params.workEmailVerified
    },
    {
      id: "publish-ready",
      title: "Profile ready",
      description: "Save the draft, then publish and boost trust.",
      done: params.publishReady,
      current: !params.publishReady
    }
  ];
}

async function enforceWorkEmailRateLimit(params: {
  scope: string;
  actorId: string;
  limit: number;
  windowMs: number;
}): Promise<void> {
  const headerStore = await headers();
  const clientIp = clientIpFromRequestHeaders(new Headers(headerStore));
  const rateLimitResult = await checkRateLimit({
    scope: params.scope,
    actorId: params.actorId,
    clientIp,
    config: {
      limit: params.limit,
      windowMs: params.windowMs
    }
  });

  if (rateLimitResult.ok) {
    return;
  }

  const query = new URLSearchParams({ error: "work_email_rate_limited" });
  if (rateLimitResult.retryAfterSeconds > 0) {
    query.set("retryAfter", String(rateLimitResult.retryAfterSeconds));
  }

  redirect(`/agent/onboarding?${query.toString()}`);
}

async function enforceResumeUploadRateLimit(params: {
  actorId: string;
  limit: number;
  windowMs: number;
}): Promise<void> {
  const headerStore = await headers();
  const clientIp = clientIpFromRequestHeaders(new Headers(headerStore));
  const rateLimitResult = await checkRateLimit({
    scope: "agent:onboarding:resume-upload",
    actorId: params.actorId,
    clientIp,
    config: {
      limit: params.limit,
      windowMs: params.windowMs
    }
  });

  if (rateLimitResult.ok) {
    return;
  }

  const query = new URLSearchParams({ error: "resume_upload_rate_limited" });
  if (rateLimitResult.retryAfterSeconds > 0) {
    query.set("retryAfter", String(rateLimitResult.retryAfterSeconds));
  }

  redirect(`/agent/onboarding?${query.toString()}`);
}

async function uploadResumeAction(formData: FormData): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/onboarding");
  }

  assertCan(session.user.role, "agent:profile:onboard");
  await enforceResumeUploadRateLimit({
    actorId: session.user.id,
    limit: getResumeFeatureFlags().resumeUploadLimitPerHour,
    windowMs: 60 * 60 * 1000
  });

  const uploadedResume = formData.get("resumeFile");
  const maybeBioText = formData.get("bioText");
  const maybeLinkedInUrl = formData.get("linkedinUrl");
  const bioText = typeof maybeBioText === "string" ? maybeBioText.trim() : "";
  const linkedInUrl =
    typeof maybeLinkedInUrl === "string" ? maybeLinkedInUrl.trim() : "";
  const resumeFile =
    uploadedResume instanceof File && uploadedResume.size > 0
      ? uploadedResume
      : undefined;

  if (!resumeFile && bioText.length === 0) {
    redirect("/agent/onboarding?error=resume_input_missing");
  }

  const rawMode = formData.get("mode");
  let mode: Parameters<typeof createResumeSuggestionsFromFile>[0]["mode"];
  if (
    rawMode === "heuristic" ||
    rawMode === "hybrid" ||
    rawMode === "llm_only"
  ) {
    mode = rawMode;
  }

  let suggestionResult: Awaited<
    ReturnType<typeof createResumeSuggestionsFromFile>
  >;
  try {
    const extractionInput: Parameters<
      typeof createResumeSuggestionsFromFile
    >[0] = {};
    if (resumeFile) {
      extractionInput.file = resumeFile;
    }
    if (bioText.length > 0) {
      extractionInput.bioText = bioText;
    }
    if (linkedInUrl.length > 0) {
      extractionInput.supplementalText = `LinkedIn URL: ${linkedInUrl}`;
    }
    if (mode) {
      extractionInput.mode = mode;
    }
    suggestionResult = await createResumeSuggestionsFromFile(extractionInput);
  } catch (error) {
    if (error instanceof ResumeExtractionError) {
      const query = new URLSearchParams({
        error: mapResumeUploadErrorToQuery(error)
      });
      const retryAfter = getRetryAfterSeconds(error.details);
      if (retryAfter) {
        query.set("retryAfter", String(retryAfter));
      }

      redirect(`/agent/onboarding?${query.toString()}`);
    }

    redirect("/agent/onboarding?error=resume_file_parse_failed");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: RESUME_SUGGESTIONS_COOKIE_NAME,
    value: encodeResumeSuggestionsCookie(suggestionResult.suggestion),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS
  });

  redirect("/agent/onboarding?success=resume_prefilled");
}

async function clearResumeSuggestionsAction(): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/onboarding");
  }

  assertCan(session.user.role, "agent:profile:onboard");

  const cookieStore = await cookies();
  cookieStore.set({
    name: RESUME_SUGGESTIONS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  redirect("/agent/onboarding?success=resume_prefill_cleared");
}

async function sendWorkEmailVerificationCodeAction(
  formData: FormData
): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/onboarding");
  }

  assertCan(session.user.role, "agent:profile:onboard");
  await enforceWorkEmailRateLimit({
    scope: "agent:onboarding:work-email:send",
    actorId: session.user.id,
    limit: 15,
    windowMs: 60 * 60 * 1000
  });

  const parsed = agentWorkEmailVerificationSendSchema.safeParse({
    workEmail: formData.get("workEmail")
  });

  if (!parsed.success) {
    redirect("/agent/onboarding?error=work_email_invalid");
  }

  let result: Awaited<
    ReturnType<typeof requestAgentWorkEmailVerificationCode>
  > | null = null;
  try {
    result = await requestAgentWorkEmailVerificationCode(
      session.user.id,
      parsed.data.workEmail
    );
  } catch (error) {
    if (error instanceof WorkEmailVerificationError) {
      const query = new URLSearchParams({
        error: mapWorkEmailVerificationErrorToQuery(error)
      });
      const retryAfter = getRetryAfterSeconds(error.details);
      if (retryAfter) {
        query.set("retryAfter", String(retryAfter));
      }

      redirect(`/agent/onboarding?${query.toString()}`);
    }

    redirect("/agent/onboarding?error=work_email_code_send_failed");
  }

  const query = new URLSearchParams({ success: "work_email_code_sent" });
  if (result.devCode) {
    query.set("devCode", result.devCode);
  }
  redirect(`/agent/onboarding?${query.toString()}`);
}

async function confirmWorkEmailVerificationCodeAction(
  formData: FormData
): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/onboarding");
  }

  assertCan(session.user.role, "agent:profile:onboard");
  await enforceWorkEmailRateLimit({
    scope: "agent:onboarding:work-email:confirm",
    actorId: session.user.id,
    limit: 25,
    windowMs: 60 * 60 * 1000
  });

  const parsed = agentWorkEmailVerificationConfirmSchema.safeParse({
    workEmail: formData.get("workEmail"),
    verificationCode: formData.get("verificationCode")
  });

  if (!parsed.success) {
    redirect("/agent/onboarding?error=work_email_code_invalid");
  }

  try {
    await confirmAgentWorkEmailVerificationCode(
      session.user.id,
      parsed.data.workEmail,
      parsed.data.verificationCode
    );
  } catch (error) {
    if (error instanceof WorkEmailVerificationError) {
      const query = new URLSearchParams({
        error: mapWorkEmailVerificationErrorToQuery(error)
      });
      const retryAfter = getRetryAfterSeconds(error.details);
      if (retryAfter) {
        query.set("retryAfter", String(retryAfter));
      }
      redirect(`/agent/onboarding?${query.toString()}`);
    }

    redirect("/agent/onboarding?error=work_email_code_invalid");
  }

  redirect("/agent/onboarding?success=work_email_verified");
}

async function submitAgentOnboardingAction(formData: FormData): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/onboarding");
  }

  assertCan(session.user.role, "agent:profile:onboard");

  const parsed = agentOnboardingSchema.safeParse({
    fullName: formData.get("fullName"),
    workEmail: formData.get("workEmail"),
    phone: formData.get("phone"),
    agencyName: formData.get("agencyName"),
    jobTitle: formData.get("jobTitle"),
    yearsExperience: formData.get("yearsExperience"),
    bio: formData.get("bio"),
    serviceAreas: parseCsvList(formData.get("serviceAreas")?.toString()),
    specialties: parseCsvList(formData.get("specialties")?.toString()),
    achievements: parseCsvList(formData.get("achievements")?.toString()),
    languages: parseCsvList(formData.get("languages")?.toString()),
    feePreference: formData.get("feePreference"),
    transactionBand: formData.get("transactionBand"),
    collaborationPreference: formData.get("collaborationPreference"),
    responseTimeMinutes: formData.get("responseTimeMinutes")
  });

  if (!parsed.success) {
    redirect("/agent/onboarding?error=invalid_fields");
  }

  const workEmailVerified = await isAgentWorkEmailVerified(
    session.user.id,
    parsed.data.workEmail
  );
  if (!workEmailVerified) {
    redirect("/agent/onboarding?error=work_email_unverified");
  }

  try {
    await completeAgentOnboarding(session.user.id, parsed.data);
  } catch (error) {
    if (error instanceof WorkEmailVerificationError) {
      redirect(
        `/agent/onboarding?error=${mapWorkEmailVerificationErrorToQuery(error)}`
      );
    }

    redirect("/agent/onboarding?error=invalid_fields");
  }

  redirect("/agent/profile/edit?success=onboarding-complete");
}

export default async function AgentOnboardingPage({
  searchParams
}: PageProps): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?next=/agent/onboarding");
  }

  if (session.user.role !== "AGENT") {
    redirect("/onboarding/role?error=invalid_role");
  }

  const profile = await getAgentProfileByUserId(session.user.id);
  const cookieStore = await cookies();
  const resumeFlags = getResumeFeatureFlags();
  const resumeSuggestions = decodeResumeSuggestionsCookie(
    cookieStore.get(RESUME_SUGGESTIONS_COOKIE_NAME)?.value
  );
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = resolvedSearchParams?.error;
  const success = resolvedSearchParams?.success;
  const retryAfterRaw = Number.parseInt(
    resolvedSearchParams?.retryAfter ?? "",
    10
  );
  const retryAfterSeconds =
    Number.isFinite(retryAfterRaw) && retryAfterRaw > 0 ? retryAfterRaw : null;
  const devCode = resolvedSearchParams?.devCode;
  const suggestedPrefill = resumeSuggestions?.prefill;
  const defaultFullName =
    profile?.user?.name ??
    suggestedPrefill?.fullName ??
    session.user.name ??
    "";
  const defaultWorkEmail =
    profile?.workEmail ??
    suggestedPrefill?.workEmail ??
    session.user.email ??
    "";
  const defaultPhone = profile?.phone ?? suggestedPrefill?.phone ?? "";
  const defaultAgencyName =
    profile?.agencyName ?? suggestedPrefill?.agencyName ?? "";
  const defaultJobTitle = profile?.jobTitle ?? suggestedPrefill?.jobTitle ?? "";
  const defaultYearsExperience =
    profile?.yearsExperience ?? suggestedPrefill?.yearsExperience ?? "";
  const defaultServiceAreas = formatCsvDefault(
    profile?.serviceAreas?.length
      ? profile.serviceAreas
      : (suggestedPrefill?.serviceAreas ?? [])
  );
  const defaultSpecialties = formatCsvDefault(
    profile?.specialties?.length
      ? profile.specialties
      : (suggestedPrefill?.specialties ?? [])
  );
  const defaultAchievements = formatCsvDefault(profile?.achievements ?? []);
  const defaultLanguages = formatCsvDefault(profile?.languages ?? []);
  const defaultBio = profile?.bio ?? suggestedPrefill?.bio ?? "";
  const defaultFeePreference = profile?.feePreference ?? "";
  const defaultTransactionBand = profile?.transactionBand ?? "";
  const defaultCollaborationPreference =
    profile?.collaborationPreference ?? "";
  const defaultResponseTimeMinutes = profile?.responseTimeMinutes
    ? String(profile.responseTimeMinutes)
    : "";
  const workEmailVerified = Boolean(profile?.workEmailVerifiedAt);
  const onboardingNotice = resolveNoticeMessage({
    error,
    success,
    retryAfterSeconds
  });

  const parsedYearsExperience =
    typeof defaultYearsExperience === "number"
      ? defaultYearsExperience
      : Number.parseInt(defaultYearsExperience, 10);
  const normalizedYearsExperience = Number.isFinite(parsedYearsExperience)
    ? parsedYearsExperience
    : null;

  const serviceAreaValues = parseCsvList(defaultServiceAreas);
  const specialtyValues = parseCsvList(defaultSpecialties);
  const achievementsValues = parseCsvList(defaultAchievements);
  const languagesValues = parseCsvList(defaultLanguages);
  const defaultResponseTimeLabel = defaultResponseTimeMinutes
    ? responseTimeLabels[
        Number(defaultResponseTimeMinutes) as keyof typeof responseTimeLabels
      ]
    : undefined;
  const structuredSignalsPreview = [
    defaultFeePreference
      ? {
          label: "Fee style",
          value:
            feePreferenceLabels[
              defaultFeePreference as keyof typeof feePreferenceLabels
            ]
        }
      : null,
    defaultTransactionBand
      ? {
          label: "Transaction band",
          value:
            transactionBandLabels[
              defaultTransactionBand as keyof typeof transactionBandLabels
            ]
        }
      : null,
    defaultCollaborationPreference
      ? {
          label: "Collaboration posture",
          value:
            collaborationPreferenceLabels[
              defaultCollaborationPreference as keyof typeof collaborationPreferenceLabels
            ]
        }
      : null,
    defaultResponseTimeLabel
      ? {
          label: "Response time",
          value: defaultResponseTimeLabel
        }
      : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const computedDraftCompleteness = calculateAgentProfileCompleteness({
    agencyName: defaultAgencyName,
    jobTitle: defaultJobTitle,
    workEmail: defaultWorkEmail,
    phone: defaultPhone,
    yearsExperience: normalizedYearsExperience,
    bio: defaultBio,
    serviceAreas: serviceAreaValues,
    specialties: specialtyValues,
    achievements: achievementsValues,
    languages: languagesValues,
    feePreference: profile?.feePreference ?? null,
    transactionBand: profile?.transactionBand ?? null,
    collaborationPreference: profile?.collaborationPreference ?? null,
    responseTimeMinutes: profile?.responseTimeMinutes ?? null
  });

  const profileReadiness = Math.max(
    0,
    Math.min(100, profile?.profileCompleteness ?? computedDraftCompleteness)
  );

  const profilePreviewFields = [
    {
      key: "fullName",
      label: "Full name",
      value: defaultFullName,
      required: true
    },
    {
      key: "agencyName",
      label: "Agency",
      value: defaultAgencyName,
      required: true
    },
    {
      key: "jobTitle",
      label: "Job title",
      value: defaultJobTitle,
      required: true
    },
    {
      key: "workEmail",
      label: "Email",
      value: defaultWorkEmail,
      required: true
    },
    { key: "phone", label: "Phone", value: defaultPhone, required: true },
    {
      key: "yearsExperience",
      label: "Experience",
      value: normalizedYearsExperience,
      required: true
    },
    {
      key: "serviceAreas",
      label: "Service areas",
      value: serviceAreaValues,
      required: true
    },
    {
      key: "specialties",
      label: "Specialties",
      value: specialtyValues,
      required: true
    },
    {
      key: "bio",
      label: "Professional summary",
      value: defaultBio,
      required: true
    },
    {
      key: "achievements",
      label: "Recent wins",
      value: achievementsValues,
      required: false
    },
    {
      key: "languages",
      label: "Languages",
      value: languagesValues,
      required: false
    },
    {
      key: "feePreference",
      label: "Fee style",
      value: defaultFeePreference,
      required: false
    },
    {
      key: "transactionBand",
      label: "Typical transaction band",
      value: defaultTransactionBand,
      required: false
    },
    {
      key: "collaborationPreference",
      label: "Collaboration posture",
      value: defaultCollaborationPreference,
      required: false
    },
    {
      key: "responseTimeMinutes",
      label: "Response time",
      value: defaultResponseTimeMinutes,
      required: false
    }
  ] as const;

  const readyFields = profilePreviewFields.filter((field) =>
    hasFieldValue(field.value)
  );
  const missingRequiredFields = profilePreviewFields.filter(
    (field) => field.required && !hasFieldValue(field.value)
  );

  const extractedResumeFields = resumeSuggestions
    ? (Object.keys(resumeSuggestions.prefill) as ResumeFieldKey[])
        .filter((fieldKey) =>
          hasFieldValue(resumeSuggestions.prefill[fieldKey])
        )
        .map((fieldKey) => resumeFieldLabels[fieldKey])
    : [];

  const lowConfidenceFields = resumeSuggestions
    ? (
        Object.entries(resumeSuggestions.confidence) as Array<
          [ResumeFieldKey, number | undefined]
        >
      )
        .filter(
          ([fieldKey, score]) =>
            typeof score === "number" &&
            score < 0.72 &&
            hasFieldValue(suggestedPrefill?.[fieldKey])
        )
        .map(([fieldKey, score]) => ({
          key: fieldKey,
          label: resumeFieldLabels[fieldKey],
          score: Math.round((score ?? 0) * 100),
          ...(resumeSuggestions.evidence[fieldKey]
            ? { evidence: resumeSuggestions.evidence[fieldKey] }
            : {})
        }))
    : [];

  const needsConfirmationByKey = Object.fromEntries(
    (resumeSuggestions?.profile.needs_confirmation ?? [])
      .map((item) => {
        const key = mapProfileNeedFieldToFormField(item.field);
        return key ? [key, item.reason] : null;
      })
      .filter(Boolean) as Array<[OnboardingFormFieldKey, string]>
  ) as Partial<Record<OnboardingFormFieldKey, string>>;
  const formValues: Record<OnboardingFormFieldKey, string> = {
    fullName: defaultFullName,
    workEmail: defaultWorkEmail,
    phone: defaultPhone,
    agencyName: defaultAgencyName,
    jobTitle: defaultJobTitle,
    yearsExperience:
      normalizedYearsExperience !== null
        ? String(normalizedYearsExperience)
        : "",
    bio: defaultBio,
    serviceAreas: defaultServiceAreas,
    specialties: defaultSpecialties,
    achievements: defaultAchievements,
    languages: defaultLanguages,
    feePreference: defaultFeePreference,
    transactionBand: defaultTransactionBand,
    collaborationPreference: defaultCollaborationPreference,
    responseTimeMinutes: defaultResponseTimeMinutes
  };

  const missingStructuredSignals = (
    [
      "feePreference",
      "transactionBand",
      "collaborationPreference",
      "responseTimeMinutes"
    ] as const
  ).filter((key) => !hasFieldValue(formValues[key]));

  const quickInterviewQuestions = buildQuickInterviewQuestions({
    missingRequiredKeys: missingRequiredFields.map(
      (field) => field.key as OnboardingFormFieldKey
    ),
    lowConfidenceFields,
    needsConfirmationByKey,
    missingStructuredSignals
  });

  const visibleQuestionKeys = new Set(
    quickInterviewQuestions.map((question) => question.key)
  );
  const manualFieldKeys = allFieldOrder.filter(
    (key) => !visibleQuestionKeys.has(key)
  );
  const publishReady =
    missingRequiredFields.length === 0 &&
    workEmailVerified &&
    profileReadiness >= MIN_AGENT_PUBLISH_COMPLETENESS;
  const agentCodePreview = (profile?.profileSlug ?? session.user.id)
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 10)
    .toUpperCase();
  const shareablePathPreview = profile?.profileSlug
    ? `/agents/${profile.profileSlug}`
    : "/agents/your-name";
  const resumeProfile = resumeSuggestions?.profile;
  const linkedInUrl = resumeProfile?.social_links.linkedin ?? null;
  const steps = createStepState({
    resumeSuggestions,
    readyFieldsCount: readyFields.length,
    missingRequiredFieldsCount: missingRequiredFields.length,
    lowConfidenceFieldsCount: lowConfidenceFields.length,
    workEmailVerified,
    publishReady,
    quickInterviewQuestionCount: quickInterviewQuestions.length
  });

  return (
    <AppShell role="AGENT" title="Build Your WHOMA Profile">
      <div className="space-y-8">
        <Card className="overflow-hidden border-line">
          <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr] xl:items-start">
            <div className="space-y-5 p-1">
              <Badge variant="accent" className="w-fit">
                AI-guided onboarding
              </Badge>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-text-strong sm:text-4xl">
                  Let&apos;s build your WHOMA profile
                </h2>
                <p className="max-w-2xl text-base text-text-muted">
                  Upload your CV, get a ready-looking draft back, answer only
                  the missing bits, then move straight into publishing and
                  trust-building.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="#import"
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Start with your CV
                </Link>
                <Link
                  href="#quick-interview"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" })
                  )}
                >
                  Review the draft
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-line bg-surface-1 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Draft readiness
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-text-strong">
                    {profileReadiness}%
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Auto-filled profile, ready for review.
                  </p>
                </div>
                <div className="rounded-2xl border border-line bg-surface-1 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Questions left
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-text-strong">
                    {quickInterviewQuestions.length}
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Only the gaps and low-confidence details.
                  </p>
                </div>
                <div className="rounded-2xl border border-line bg-surface-1 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Next win
                  </p>
                  <p className="mt-2 text-lg font-semibold text-text-strong">
                    Log one past deal
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    We tee this up as soon as the draft is saved.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface-1/90 space-y-3 rounded-[28px] border border-line p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Onboarding flow
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Built around one high-signal action: importing your
                    professional history first.
                  </p>
                </div>
                <Badge variant={publishReady ? "success" : "warning"}>
                  {publishReady ? "Ready to save" : "In progress"}
                </Badge>
              </div>
              <ol className="space-y-2">
                {steps.map((step, index) => (
                  <li key={step.id}>
                    <a
                      href={`#${step.id}`}
                      className="flex items-start gap-3 rounded-2xl border border-line bg-surface-0 px-3 py-3 transition-colors hover:bg-surface-1"
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          step.done
                            ? "bg-state-success/15 text-state-success"
                            : step.current
                              ? "bg-brand-accent/15 text-brand-ink"
                              : "bg-surface-1 text-text-muted"
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="space-y-1">
                        <span className="block text-sm font-medium text-text-strong">
                          {step.title}
                        </span>
                        <span className="block text-sm text-text-muted">
                          {step.description}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>

        {onboardingNotice ? (
          <p
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              noticeToneClasses[onboardingNotice.tone]
            )}
          >
            {onboardingNotice.message}
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Card className="space-y-4 border-line">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Draft health
                </p>
                <h3 className="text-lg font-semibold text-text-strong">
                  Profile draft status
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Publish readiness</span>
                  <span className="font-semibold text-text-strong">
                    {profileReadiness}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-1">
                  <div
                    className="h-2 rounded-full bg-brand-accent"
                    style={{ width: `${profileReadiness}%` }}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-line bg-surface-1 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                    Shareable URL
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-strong">
                    {shareablePathPreview}
                  </p>
                </div>
                <div className="rounded-2xl border border-line bg-surface-1 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                    Agent code
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-strong">
                    {agentCodePreview}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-surface-1 px-4 py-3 text-sm text-text-muted">
                {publishReady
                  ? "The draft is ready. Save it, publish from the profile workspace, then boost trust by logging one past deal."
                  : `You are ${Math.max(0, MIN_AGENT_PUBLISH_COMPLETENESS - profileReadiness)}% away from the publish threshold before verification.`}
              </div>
            </Card>

            <Card className="border-line">
              <ActivationChecklist
                profile={profile}
                title="Profile milestones"
                description="Move from imported draft to a public, trusted profile without hunting through the app."
              />
            </Card>
          </aside>

          <div className="space-y-6">
            <Card id="import" className="space-y-5 border-line">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Step 1 · Import
                </p>
                <h3 className="text-xl font-semibold text-text-strong">
                  Upload a CV and let WHOMA do the first pass
                </h3>
                <p className="max-w-2xl text-sm text-text-muted">
                  We parse your CV into a structured draft, pull out the
                  strongest profile signals, and leave you with a short review
                  instead of a blank form.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <form
                  action={uploadResumeAction}
                  className="space-y-4 rounded-[24px] border border-line bg-surface-1 px-5 py-5"
                >
                  <input
                    type="hidden"
                    name="mode"
                    value={resumeFlags.resumePrefillMode}
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-text-strong">
                      CV or resume file
                    </span>
                    <Input
                      name="resumeFile"
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.markdown,.rtf,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/rtf,application/rtf,image/png,image/jpeg,image/webp"
                      required
                    />
                  </div>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-text-strong">
                      LinkedIn URL (optional)
                    </span>
                    <Input
                      name="linkedinUrl"
                      type="url"
                      placeholder="https://www.linkedin.com/in/your-profile"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="lg">
                      Upload CV / Resume
                    </Button>
                    <Link
                      href="#quick-interview"
                      className={cn(buttonVariants({ variant: "secondary" }))}
                    >
                      Skip to review
                    </Link>
                  </div>
                </form>

                <form
                  action={uploadResumeAction}
                  className="space-y-4 rounded-[24px] border border-line bg-surface-1 px-5 py-5"
                >
                  <input
                    type="hidden"
                    name="mode"
                    value={resumeFlags.resumePrefillMode}
                  />
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-text-strong">
                      Paste LinkedIn bio or professional summary
                    </span>
                    <Textarea
                      name="bioText"
                      rows={5}
                      placeholder="Paste your LinkedIn About section or a polished professional bio."
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-text-strong">
                      LinkedIn URL (optional)
                    </span>
                    <Input
                      name="linkedinUrl"
                      type="url"
                      placeholder="https://www.linkedin.com/in/your-profile"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="secondary">
                      Build from pasted bio
                    </Button>
                    <Link
                      href="#confirm-details"
                      className={cn(buttonVariants({ variant: "tertiary" }))}
                    >
                      Continue manually
                    </Link>
                  </div>
                </form>
              </div>
            </Card>

            <Card id="draft-preview" className="space-y-5 border-line">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Step 2 · Draft preview
                  </p>
                  <h3 className="text-xl font-semibold text-text-strong">
                    A draft that already looks ready
                  </h3>
                  <p className="max-w-2xl text-sm text-text-muted">
                    The goal is simple: land you in something that feels 70–90%
                    finished, then ask only for what still needs human
                    confirmation.
                  </p>
                </div>
                <Badge variant={publishReady ? "success" : "accent"}>
                  {resumeProfile?.publish_readiness_score ?? profileReadiness}%
                  extracted readiness
                </Badge>
              </div>

              {resumeSuggestions ? (
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4 rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-text-strong">
                          Building your profile draft
                        </p>
                        <p className="text-xs text-text-muted">
                          Extracted from {resumeSuggestions.sourceFileName} (
                          {resumeSuggestions.sourceMimeType})
                        </p>
                      </div>
                      <Badge variant="success">Draft created</Badge>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-2xl font-semibold text-text-strong">
                        {defaultFullName || "Your name"}
                      </h4>
                      <p className="text-sm text-text-muted">
                        {[defaultJobTitle, defaultAgencyName]
                          .filter(Boolean)
                          .join(" · ") ||
                          "Role and agency pending confirmation"}
                      </p>
                    </div>
                    <p className="text-sm text-text-muted">
                      {resumeSuggestions.summary}
                    </p>
                    {defaultBio ? (
                      <div className="rounded-2xl border border-line bg-surface-0 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                          Profile summary draft
                        </p>
                        <p className="mt-2 text-sm text-text-muted">
                          {defaultBio}
                        </p>
                      </div>
                    ) : null}
                    {resumeSuggestions.highlights.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                          Imported signals
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {resumeSuggestions.highlights.map((highlight) => (
                            <span
                              key={highlight}
                              className="rounded-full border border-line bg-surface-0 px-2.5 py-1 text-xs text-text-strong"
                            >
                              {highlight}
                            </span>
                          ))}
                          {linkedInUrl ? (
                            <span className="rounded-full border border-line bg-surface-0 px-2.5 py-1 text-xs text-text-strong">
                              LinkedIn detected
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {resumeSuggestions.warnings.length > 0 ? (
                      <ul className="space-y-1 text-xs text-state-warning">
                        {resumeSuggestions.warnings.map((warning) => (
                          <li
                            key={warning}
                            className="border-state-warning/20 bg-state-warning/10 rounded-xl border px-3 py-2"
                          >
                            {warning}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <form action={clearResumeSuggestionsAction}>
                      <Button type="submit" variant="secondary" size="sm">
                        Clear imported draft
                      </Button>
                    </form>
                  </div>

                  <div className="space-y-4 rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        Structured profile fields
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-line bg-surface-0 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                            Service areas
                          </p>
                          <p className="mt-1 text-sm font-medium text-text-strong">
                            {serviceAreaValues.length > 0
                              ? serviceAreaValues.join(", ")
                              : "Missing"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-line bg-surface-0 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                            Specialties
                          </p>
                          <p className="mt-1 text-sm font-medium text-text-strong">
                            {specialtyValues.length > 0
                              ? specialtyValues.join(", ")
                              : "Missing"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-line bg-surface-0 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                            Experience
                          </p>
                          <p className="mt-1 text-sm font-medium text-text-strong">
                            {normalizedYearsExperience !== null
                              ? `${normalizedYearsExperience} years`
                              : "Missing"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-line bg-surface-0 px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                            Contact
                          </p>
                          <p className="mt-1 text-sm font-medium text-text-strong">
                            {[defaultWorkEmail, defaultPhone]
                              .filter(Boolean)
                              .join(" · ") || "Pending"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {resumeProfile?.credentials.length ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                          Credentials
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {resumeProfile.credentials.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-line bg-surface-0 px-2.5 py-1 text-xs text-text-strong"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {resumeProfile?.notable_experience.length ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                          Notable experience
                        </p>
                        <ul className="space-y-1 text-sm text-text-muted">
                          {resumeProfile.notable_experience
                            .slice(0, 4)
                            .map((item) => (
                              <li
                                key={item}
                                className="rounded-xl border border-line bg-surface-0 px-3 py-2"
                              >
                                {item}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                    {structuredSignalsPreview.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                          Working style signals
                        </p>
                        <ul className="space-y-1 text-sm text-text-muted">
                          {structuredSignalsPreview.map((item) => (
                            <li
                              key={item.label}
                              className="rounded-xl border border-line bg-surface-0 px-3 py-2"
                            >
                              <span className="font-medium text-text-strong">
                                {item.label}:
                              </span>{" "}
                              {item.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {resumeProfile?.recommended_next_steps.length ? (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                          What WHOMA still needs
                        </p>
                        <ul className="space-y-1 text-sm text-text-muted">
                          {resumeProfile.recommended_next_steps
                            .slice(0, 4)
                            .map((item) => (
                              <li
                                key={item}
                                className="rounded-xl border border-line bg-surface-0 px-3 py-2"
                              >
                                {item}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                    {linkedInUrl ? (
                      <div className="rounded-2xl border border-line bg-surface-0 px-4 py-3 text-sm text-text-muted">
                        LinkedIn reference:{" "}
                        <a
                          href={linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-text-strong underline underline-offset-4"
                        >
                          {linkedInUrl}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-line bg-surface-1 px-5 py-5">
                  <p className="text-sm text-text-muted">
                    Start with your CV or bio and we&apos;ll land you in a
                    structured draft here instead of a blank profile form.
                  </p>
                </div>
              )}
            </Card>

            <Card id="confirm-details" className="space-y-5 border-line">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Step 3 · Confirm details
                </p>
                <h3 className="text-xl font-semibold text-text-strong">
                  Stay in yes / no / edit mode
                </h3>
                <p className="max-w-2xl text-sm text-text-muted">
                  We surface what already looks good, call out anything
                  uncertain, and keep the review pass short.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-3 rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-strong">
                      Detected and ready
                    </p>
                    <Badge variant="success">{readyFields.length}</Badge>
                  </div>
                  {readyFields.length > 0 ? (
                    <ul className="space-y-2 text-sm text-text-muted">
                      {readyFields.map((field) => (
                        <li
                          key={field.key}
                          className="rounded-xl border border-line bg-surface-0 px-3 py-2"
                        >
                          {field.label}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-muted">
                      Import a CV to populate the first ready set.
                    </p>
                  )}
                </div>

                <div className="space-y-3 rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-strong">
                      Needs confirmation
                    </p>
                    <Badge
                      variant={
                        lowConfidenceFields.length > 0 ? "warning" : "default"
                      }
                    >
                      {lowConfidenceFields.length}
                    </Badge>
                  </div>
                  {lowConfidenceFields.length > 0 ? (
                    <ul className="space-y-2 text-sm text-text-muted">
                      {lowConfidenceFields.map((item) => (
                        <li
                          key={item.key}
                          className="border-state-warning/20 bg-state-warning/10 rounded-xl border px-3 py-2"
                        >
                          <p className="font-medium text-text-strong">
                            {item.label}
                          </p>
                          <p>
                            {item.evidence
                              ? `Detected: ${item.evidence}`
                              : "Imported from your draft"}
                          </p>
                          <p className="text-xs">{item.score}% confidence</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-muted">
                      No low-confidence fields right now.
                    </p>
                  )}
                </div>

                <div className="space-y-3 rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-strong">
                      Still missing
                    </p>
                    <Badge
                      variant={
                        missingRequiredFields.length > 0 ? "warning" : "success"
                      }
                    >
                      {missingRequiredFields.length +
                        (workEmailVerified ? 0 : 1)}
                    </Badge>
                  </div>
                  <ul className="space-y-2 text-sm text-text-muted">
                    {missingRequiredFields.map((field) => (
                      <li
                        key={field.key}
                        className="rounded-xl border border-line bg-surface-0 px-3 py-2"
                      >
                        {field.label}
                      </li>
                    ))}
                    {!workEmailVerified ? (
                      <li className="rounded-xl border border-line bg-surface-0 px-3 py-2">
                        Email verification
                      </li>
                    ) : null}
                    {missingRequiredFields.length === 0 && workEmailVerified ? (
                      <li className="border-state-success/20 bg-state-success/10 rounded-xl border px-3 py-2 text-state-success">
                        Core publish requirements are covered.
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>

              {extractedResumeFields.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {extractedResumeFields.map((field) => (
                    <span
                      key={field}
                      className="rounded-full border border-line bg-surface-1 px-2.5 py-1 text-xs text-text-strong"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>

            <Card id="quick-interview" className="space-y-5 border-line">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Step 4 · Quick interview
                </p>
                <h3 className="text-xl font-semibold text-text-strong">
                  Answer only what the draft still needs
                </h3>
                <p className="max-w-2xl text-sm text-text-muted">
                  {quickInterviewQuestions.length > 0
                    ? `We cut this down to ${quickInterviewQuestions.length} targeted question${quickInterviewQuestions.length === 1 ? "" : "s"}.`
                    : "No extra questions are required right now. Save the draft when you&apos;re happy with the imported details."}
                </p>
              </div>

              <form action={submitAgentOnboardingAction} className="space-y-5">
                {quickInterviewQuestions.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {quickInterviewQuestions.map((question, index) => (
                      <div
                        key={question.key}
                        className={cn(
                          "space-y-3 rounded-[24px] border px-5 py-5",
                          question.inputType === "textarea"
                            ? "lg:col-span-2"
                            : "",
                          question.confidence
                            ? "border-state-warning/20 bg-state-warning/10"
                            : "border-line bg-surface-1"
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                            Question {index + 1}
                          </p>
                          <h4 className="text-base font-semibold text-text-strong">
                            {question.prompt}
                          </h4>
                          <p className="text-sm text-text-muted">
                            {question.hint}
                          </p>
                          {question.evidence ? (
                            <p className="text-xs text-text-muted">
                              Detected from CV: {question.evidence}
                            </p>
                          ) : null}
                        </div>
                        {renderFieldControl(
                          question.key,
                          formValues[question.key]
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-state-success/20 bg-state-success/10 rounded-[24px] border px-5 py-5 text-sm text-state-success">
                    Your imported draft already covers the core onboarding
                    questions. Save it to move into publishing.
                  </div>
                )}

                {manualFieldKeys.length > 0 ? (
                  <details className="rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                    <summary className="cursor-pointer list-none text-sm font-medium text-text-strong">
                      Need to edit something else? Open the full manual view.
                    </summary>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {manualFieldKeys.map((key) => (
                        <div
                          key={key}
                          className={key === "bio" ? "md:col-span-2" : ""}
                        >
                          {renderFieldControl(key, formValues[key])}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save profile draft</Button>
                  <Link
                    href="/agent/profile/edit"
                    className={cn(buttonVariants({ variant: "secondary" }))}
                  >
                    Open full profile editor
                  </Link>
                </div>
              </form>
            </Card>

            <Card id="verification-gate" className="space-y-4 border-line">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Step 5 · Publish gate
                  </p>
                  <h3 className="text-base font-semibold text-text-strong">
                    Email verification
                  </h3>
                </div>
                <Badge variant={workEmailVerified ? "success" : "warning"}>
                  {workEmailVerified ? "Verified" : "Not verified"}
                </Badge>
              </div>
              <p className="text-sm text-text-muted">
                Verification is intentionally quiet. Clear it once here, then
                the path to publishing stays simple.
              </p>

              <form className="space-y-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Email for verification
                  </span>
                  <Input
                    name="workEmail"
                    type="email"
                    required
                    defaultValue={defaultWorkEmail}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">
                    Verification code
                  </span>
                  <Input
                    name="verificationCode"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    formAction={sendWorkEmailVerificationCodeAction}
                  >
                    Send code
                  </Button>
                  <Button
                    type="submit"
                    variant="secondary"
                    formAction={confirmWorkEmailVerificationCodeAction}
                  >
                    Verify
                  </Button>
                </div>
              </form>

              {devCode ? (
                <p className="border-state-warning/20 bg-state-warning/10 rounded-xl border px-3 py-2 text-xs text-state-warning">
                  Dev verification code: {devCode}
                </p>
              ) : null}
            </Card>

            <Card id="publish-ready" className="space-y-4 border-line">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Step 6 · Profile ready
                </p>
                <h3 className="text-xl font-semibold text-text-strong">
                  Finish strong, then give them an immediate win
                </h3>
                <p className="max-w-2xl text-sm text-text-muted">
                  After you save the draft, we take the agent straight into the
                  profile workspace where the first follow-up action is logging
                  a past deal to boost trust.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                <div className="space-y-3 rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-strong">
                      Current launch state
                    </p>
                    <Badge variant={publishReady ? "success" : "warning"}>
                      {publishReady ? "Ready to save" : "Still in review"}
                    </Badge>
                  </div>
                  <ul className="space-y-2 text-sm text-text-muted">
                    <li className="rounded-xl border border-line bg-surface-0 px-3 py-2">
                      Draft completeness:{" "}
                      <span className="font-medium text-text-strong">
                        {profileReadiness}%
                      </span>
                    </li>
                    <li className="rounded-xl border border-line bg-surface-0 px-3 py-2">
                      Verification:{" "}
                      <span className="font-medium text-text-strong">
                        {workEmailVerified ? "ready" : "still needed"}
                      </span>
                    </li>
                    <li className="rounded-xl border border-line bg-surface-0 px-3 py-2">
                      Next trust action:{" "}
                      <span className="font-medium text-text-strong">
                        log one historic deal
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3 rounded-[24px] border border-line bg-surface-1 px-5 py-5">
                  <p className="text-sm font-semibold text-text-strong">
                    What happens after save
                  </p>
                  <ol className="space-y-2 text-sm text-text-muted">
                    <li>
                      1. Land in the profile workspace with your draft already
                      loaded.
                    </li>
                    <li>
                      2. Publish when you&apos;re satisfied with the
                      public-facing details.
                    </li>
                    <li>
                      3. Boost credibility in two minutes by logging one past
                      deal.
                    </li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="#quick-interview"
                      className={cn(buttonVariants({ variant: "secondary" }))}
                    >
                      Review questions again
                    </Link>
                    <Link
                      href="#import"
                      className={cn(buttonVariants({ variant: "tertiary" }))}
                    >
                      Re-import CV
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
