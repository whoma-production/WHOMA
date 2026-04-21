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
  agentOnboardingSchema,
  agentWorkEmailVerificationConfirmSchema,
  agentWorkEmailVerificationSendSchema,
  parseCsvList
} from "@/lib/validation/agent-profile";
import { cn } from "@/lib/utils";
import {
  createResumeSuggestionsFromFile
} from "@/server/agent-profile/resume-ai";
import { getResumeFeatureFlags } from "@/server/agent-profile/resume-flags";
import { ResumeExtractionError } from "@/server/agent-profile/resume-intake";
import {
  decodeResumeSuggestionsCookie,
  encodeResumeSuggestionsCookie,
  RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS,
  RESUME_SUGGESTIONS_COOKIE_NAME,
  type ResumePrefillValues
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
import { checkRateLimit, clientIpFromRequestHeaders } from "@/server/http/rate-limit";

interface PageProps {
  searchParams?: Promise<{ error?: string; success?: string; devCode?: string; retryAfter?: string }>;
}

function mapWorkEmailVerificationErrorToQuery(error: WorkEmailVerificationError): string {
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

  const maybeRetryAfter = (details as { retryAfterSeconds?: unknown }).retryAfterSeconds;
  if (typeof maybeRetryAfter === "number" && Number.isFinite(maybeRetryAfter) && maybeRetryAfter > 0) {
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

type ResumeFieldKey = keyof ResumePrefillValues;

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
    return { tone: "warning", message: "Choose a CV or resume file before uploading." };
  }

  if (params.error === "resume_input_missing") {
    return { tone: "warning", message: "Upload a CV/resume or paste a professional bio to continue." };
  }

  if (params.error === "resume_file_empty") {
    return { tone: "danger", message: "The uploaded file was empty." };
  }

  if (params.error === "resume_file_too_large") {
    return { tone: "danger", message: "CV and resume files must be 4 MB or smaller." };
  }

  if (params.error === "resume_file_unsupported") {
    return { tone: "danger", message: "Upload a PDF, DOCX, TXT, MD, RTF, PNG, JPG, or WEBP file." };
  }

  if (params.error === "resume_file_parse_failed") {
    return {
      tone: "danger",
      message: "We could not read that document. Try a different export or format."
    };
  }

  if (params.error === "resume_file_text_short") {
    return {
      tone: "warning",
      message: "We extracted too little text to build useful profile suggestions."
    };
  }

  if (params.error === "resume_file_no_suggestions") {
    return {
      tone: "warning",
      message: "We read your document but could not confidently map profile fields yet."
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
    return { tone: "warning", message: `Too many resume uploads from your session.${retrySuffix}` };
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
      message: "Enter a valid email address before requesting a verification code."
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
      message: "We could not send a verification code right now. Please try again."
    };
  }

  if (params.error === "work_email_delivery_unavailable") {
    return {
      tone: "danger",
      message: "Verification email delivery is temporarily unavailable. Please try again shortly."
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
      message: "Your verification code expired. Request a new code and try again."
    };
  }

  if (params.error === "work_email_code_invalid") {
    return {
      tone: "danger",
      message: "The verification code is invalid. Enter the latest 6-digit code sent to your email."
    };
  }

  if (params.error === "work_email_code_email_mismatch") {
    return {
      tone: "warning",
      message: "That code was requested for a different email. Use the same email for send and verify."
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
      message: "Too many incorrect verification attempts. Request a new code after the lock period."
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
      message: "Verification code sent. Enter the 6-digit code to verify your email."
    };
  }

  if (params.success === "work_email_verified") {
    return {
      tone: "success",
      message: "Email verified. You can now complete onboarding and publish when ready."
    };
  }

  if (params.success === "resume_prefilled") {
    return {
      tone: "success",
      message: "Profile draft created from your document. Review and confirm the suggested details."
    };
  }

  if (params.success === "resume_prefill_cleared") {
    return { tone: "success", message: "Resume suggestions cleared." };
  }

  return null;
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
  const bioText = typeof maybeBioText === "string" ? maybeBioText.trim() : "";
  const resumeFile =
    uploadedResume instanceof File && uploadedResume.size > 0 ? uploadedResume : undefined;

  if (!resumeFile && bioText.length === 0) {
    redirect("/agent/onboarding?error=resume_input_missing");
  }

  const rawMode = formData.get("mode");
  let mode: Parameters<typeof createResumeSuggestionsFromFile>[0]["mode"];
  if (rawMode === "heuristic" || rawMode === "hybrid" || rawMode === "llm_only") {
    mode = rawMode;
  }

  let suggestionResult: Awaited<ReturnType<typeof createResumeSuggestionsFromFile>>;
  try {
    const extractionInput: Parameters<typeof createResumeSuggestionsFromFile>[0] = {};
    if (resumeFile) {
      extractionInput.file = resumeFile;
    }
    if (bioText.length > 0) {
      extractionInput.bioText = bioText;
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

async function sendWorkEmailVerificationCodeAction(formData: FormData): Promise<void> {
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

  let result: Awaited<ReturnType<typeof requestAgentWorkEmailVerificationCode>> | null = null;
  try {
    result = await requestAgentWorkEmailVerificationCode(session.user.id, parsed.data.workEmail);
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

async function confirmWorkEmailVerificationCodeAction(formData: FormData): Promise<void> {
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
    await confirmAgentWorkEmailVerificationCode(session.user.id, parsed.data.workEmail, parsed.data.verificationCode);
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
    specialties: parseCsvList(formData.get("specialties")?.toString())
  });

  if (!parsed.success) {
    redirect("/agent/onboarding?error=invalid_fields");
  }

  const workEmailVerified = await isAgentWorkEmailVerified(session.user.id, parsed.data.workEmail);
  if (!workEmailVerified) {
    redirect("/agent/onboarding?error=work_email_unverified");
  }

  try {
    await completeAgentOnboarding(session.user.id, parsed.data);
  } catch (error) {
    if (error instanceof WorkEmailVerificationError) {
      redirect(`/agent/onboarding?error=${mapWorkEmailVerificationErrorToQuery(error)}`);
    }

    redirect("/agent/onboarding?error=invalid_fields");
  }

  redirect("/agent/profile/edit?success=onboarding-complete");
}

export default async function AgentOnboardingPage({ searchParams }: PageProps): Promise<JSX.Element> {
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
  const retryAfterRaw = Number.parseInt(resolvedSearchParams?.retryAfter ?? "", 10);
  const retryAfterSeconds =
    Number.isFinite(retryAfterRaw) && retryAfterRaw > 0 ? retryAfterRaw : null;
  const devCode = resolvedSearchParams?.devCode;
  const suggestedPrefill = resumeSuggestions?.prefill;
  const defaultFullName = profile?.user?.name ?? suggestedPrefill?.fullName ?? session.user.name ?? "";
  const defaultWorkEmail = profile?.workEmail ?? suggestedPrefill?.workEmail ?? session.user.email ?? "";
  const defaultPhone = profile?.phone ?? suggestedPrefill?.phone ?? "";
  const defaultAgencyName = profile?.agencyName ?? suggestedPrefill?.agencyName ?? "";
  const defaultJobTitle = profile?.jobTitle ?? suggestedPrefill?.jobTitle ?? "";
  const defaultYearsExperience = profile?.yearsExperience ?? suggestedPrefill?.yearsExperience ?? "";
  const defaultServiceAreas = formatCsvDefault(
    profile?.serviceAreas?.length ? profile.serviceAreas : suggestedPrefill?.serviceAreas ?? []
  );
  const defaultSpecialties = formatCsvDefault(
    profile?.specialties?.length ? profile.specialties : suggestedPrefill?.specialties ?? []
  );
  const defaultBio = profile?.bio ?? suggestedPrefill?.bio ?? "";
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

  const computedDraftCompleteness = calculateAgentProfileCompleteness({
    agencyName: defaultAgencyName,
    jobTitle: defaultJobTitle,
    workEmail: defaultWorkEmail,
    phone: defaultPhone,
    yearsExperience: normalizedYearsExperience,
    bio: defaultBio,
    serviceAreas: parseCsvList(defaultServiceAreas),
    specialties: parseCsvList(defaultSpecialties),
    achievements: profile?.achievements ?? [],
    languages: profile?.languages ?? []
  });

  const profileReadiness = Math.max(
    0,
    Math.min(100, profile?.profileCompleteness ?? computedDraftCompleteness)
  );

  const profilePreviewFields = [
    { key: "agencyName", label: "Agency", value: defaultAgencyName, required: true },
    { key: "jobTitle", label: "Role", value: defaultJobTitle, required: true },
    { key: "workEmail", label: "Email", value: defaultWorkEmail, required: true },
    { key: "phone", label: "Phone", value: defaultPhone, required: true },
    { key: "yearsExperience", label: "Experience", value: normalizedYearsExperience, required: true },
    { key: "bio", label: "Professional summary", value: defaultBio, required: true },
    { key: "serviceAreas", label: "Service areas", value: parseCsvList(defaultServiceAreas), required: true },
    { key: "specialties", label: "Specialties", value: parseCsvList(defaultSpecialties), required: true }
  ] as const;

  const readyFields = profilePreviewFields.filter((field) => hasFieldValue(field.value));
  const missingRequiredFields = profilePreviewFields.filter(
    (field) => field.required && !hasFieldValue(field.value)
  );

  const extractedResumeFields = resumeSuggestions
    ? (Object.keys(resumeSuggestions.prefill) as ResumeFieldKey[])
        .filter((fieldKey) => hasFieldValue(resumeSuggestions.prefill[fieldKey]))
        .map((fieldKey) => resumeFieldLabels[fieldKey])
    : [];

  const lowConfidenceFields = resumeSuggestions
    ? (Object.entries(resumeSuggestions.confidence) as Array<[ResumeFieldKey, number | undefined]>)
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
          evidence: resumeSuggestions.evidence[fieldKey]
        }))
    : [];

  const recommendationChecks = [
    {
      key: "achievements",
      title: "Add recent deal highlights",
      done: Boolean(profile?.achievements?.length)
    },
    {
      key: "languages",
      title: "Add language coverage",
      done: Boolean(profile?.languages?.length)
    }
  ] as const;

  const agentCodePreview = (profile?.profileSlug ?? session.user.id)
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 10)
    .toUpperCase();
  const shareablePathPreview = profile?.profileSlug
    ? `/agents/${profile.profileSlug}`
    : "/agents/your-name";

  return (
    <AppShell role="AGENT" title="Build Your WHOMA Profile">
      <div className="space-y-6">
        <Card className="space-y-5">
          <div className="space-y-2">
            <Badge variant="accent" className="w-fit">
              AI-assisted onboarding
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight text-text-strong">
              Let&apos;s build your WHOMA profile
            </h2>
            <p className="max-w-2xl text-sm text-text-muted">
              Upload your CV, resume, or professional bio and we&apos;ll generate
              your profile draft automatically. You only fill the remaining
              gaps before publishing.
            </p>
          </div>

          {onboardingNotice ? (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                noticeToneClasses[onboardingNotice.tone]
              )}
            >
              {onboardingNotice.message}
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
            <div className="space-y-4">
              <form
                action={uploadResumeAction}
                encType="multipart/form-data"
                className="space-y-4 rounded-lg border border-line bg-surface-1 px-4 py-4"
              >
                <input type="hidden" name="mode" value={resumeFlags.resumePrefillMode} />
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">CV or resume file</span>
                  <Input
                    name="resumeFile"
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.markdown,.rtf,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/rtf,application/rtf,image/png,image/jpeg,image/webp"
                    required
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="lg">
                    Upload CV / Resume
                  </Button>
                  <Link href="#confirm-details" className={cn(buttonVariants({ variant: "secondary" }))}>
                    Enter manually
                  </Link>
                  <Link href="#bio-paste" className={cn(buttonVariants({ variant: "tertiary" }))}>
                    Paste LinkedIn bio
                  </Link>
                </div>
              </form>

              <form
                id="bio-paste"
                action={uploadResumeAction}
                className="space-y-3 rounded-lg border border-line bg-surface-1 px-4 py-4"
              >
                <input type="hidden" name="mode" value={resumeFlags.resumePrefillMode} />
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">Paste LinkedIn bio or professional summary</span>
                  <Textarea
                    name="bioText"
                    rows={4}
                    placeholder="Paste your LinkedIn About section or professional bio. We will generate your profile draft from this text."
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="secondary">
                    Build from pasted bio
                  </Button>
                  <Link href="#confirm-details" className={cn(buttonVariants({ variant: "tertiary" }))}>
                    Continue manually
                  </Link>
                </div>
              </form>
            </div>

            <div className="space-y-3 rounded-lg border border-line bg-surface-1 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                Flow
              </p>
              <ol className="space-y-2 text-sm text-text-muted">
                <li>Upload</li>
                <li>Parse</li>
                <li>Review</li>
                <li>Fill gaps</li>
                <li>Publish and share</li>
              </ol>
              <p className="text-xs text-text-muted">
                The first screen stays focused on one high-signal action:
                getting your profile document into WHOMA.
              </p>
            </div>
          </div>

          {resumeSuggestions ? (
            <div className="space-y-3 rounded-lg border border-line bg-surface-1 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-strong">
                    Building your WHOMA profile
                  </p>
                  <p className="text-xs text-text-muted">
                    Extracted from {resumeSuggestions.sourceFileName} ({resumeSuggestions.sourceMimeType})
                  </p>
                </div>
                <Badge variant="success">
                  Profile draft {profileReadiness}% complete
                </Badge>
              </div>
              <p className="text-sm text-text-muted">{resumeSuggestions.summary}</p>
              {extractedResumeFields.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Extracted fields
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {extractedResumeFields.map((field) => (
                      <span
                        key={field}
                        className="rounded-full border border-line bg-surface-0 px-2.5 py-1 text-xs text-text-strong"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {resumeSuggestions.highlights.length > 0 ? (
                <ul className="space-y-1 text-xs text-text-muted">
                  {resumeSuggestions.highlights.map((highlight) => (
                    <li key={highlight} className="rounded-md border border-line bg-surface-0 px-2 py-1">
                      {highlight}
                    </li>
                  ))}
                </ul>
              ) : null}
              {resumeSuggestions.warnings.length > 0 ? (
                <ul className="space-y-1 text-xs text-state-warning">
                  {resumeSuggestions.warnings.map((warning) => (
                    <li
                      key={warning}
                      className="rounded-md border border-state-warning/20 bg-state-warning/10 px-2 py-1"
                    >
                      {warning}
                    </li>
                  ))}
                </ul>
              ) : null}
              <form action={clearResumeSuggestionsAction}>
                <Button type="submit" variant="secondary" size="sm">
                  Clear suggestions
                </Button>
              </form>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-surface-1 px-4 py-4">
              <p className="text-sm text-text-muted">
                Start with your CV to generate a profile draft instantly. If
                you prefer, you can still continue manually below.
              </p>
            </div>
          )}
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                Your WHOMA profile preview
              </p>
              <h3 className="text-lg font-semibold text-text-strong">
                {defaultFullName || "Your name"}{" "}
                <span className="font-normal text-text-muted">
                  {defaultJobTitle ? `· ${defaultJobTitle}` : ""}
                </span>
              </h3>
              <p className="text-sm text-text-muted">
                This is the draft we&apos;ve assembled. Confirm details and fill
                only the missing items to reach publish readiness.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Profile readiness</span>
                <span className="font-semibold text-text-strong">{profileReadiness}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-1">
                <div
                  className="h-2 rounded-full bg-brand-accent"
                  style={{ width: `${profileReadiness}%` }}
                />
              </div>
              <p className="text-sm text-text-muted">
                {profileReadiness >= MIN_AGENT_PUBLISH_COMPLETENESS
                  ? "Draft is publish-ready. Final checks and verification remain."
                  : `You are ${Math.max(0, MIN_AGENT_PUBLISH_COMPLETENESS - profileReadiness)}% away from publish-ready.`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 rounded-md border border-line bg-surface-1 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Agency</p>
                <p className="text-sm font-medium text-text-strong">{defaultAgencyName || "Missing"}</p>
              </div>
              <div className="space-y-1 rounded-md border border-line bg-surface-1 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Email</p>
                <p className="text-sm font-medium text-text-strong">{defaultWorkEmail || "Missing"}</p>
              </div>
              <div className="space-y-1 rounded-md border border-line bg-surface-1 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Phone</p>
                <p className="text-sm font-medium text-text-strong">{defaultPhone || "Missing"}</p>
              </div>
              <div className="space-y-1 rounded-md border border-line bg-surface-1 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Experience</p>
                <p className="text-sm font-medium text-text-strong">
                  {normalizedYearsExperience !== null ? `${normalizedYearsExperience} years` : "Missing"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Specialties</p>
              {parseCsvList(defaultSpecialties).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {parseCsvList(defaultSpecialties).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-surface-1 px-2.5 py-1 text-xs text-text-strong"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Missing</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Service areas</p>
              {parseCsvList(defaultServiceAreas).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {parseCsvList(defaultServiceAreas).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-surface-1 px-2.5 py-1 text-xs text-text-strong"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Missing</p>
              )}
            </div>

            <div className="space-y-1 rounded-md border border-line bg-surface-1 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Professional summary</p>
              <p className="text-sm text-text-muted">
                {defaultBio || "Missing"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 rounded-md border border-line bg-surface-1 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Shareable URL preview</p>
                <p className="text-sm font-medium text-text-strong">{shareablePathPreview}</p>
              </div>
              <div className="space-y-1 rounded-md border border-line bg-surface-1 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Agent code preview</p>
                <p className="text-sm font-medium text-text-strong">{agentCodePreview}</p>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-text-strong">Finish your profile</h3>
                <p className="text-sm text-text-muted">
                  We&apos;ve created your draft profile. Confirm what&apos;s ready
                  and complete only the gaps needed for publishing.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Ready now
                </p>
                {readyFields.length > 0 ? (
                  <ul className="space-y-1 text-sm text-text-muted">
                    {readyFields.map((field) => (
                      <li key={field.key} className="rounded-md border border-line bg-surface-1 px-3 py-2">
                        {field.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-muted">No core fields captured yet.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Still needed to publish
                </p>
                <ul className="space-y-1 text-sm text-text-muted">
                  {missingRequiredFields.map((field) => (
                    <li key={field.key} className="rounded-md border border-line bg-surface-1 px-3 py-2">
                      {field.label}
                    </li>
                  ))}
                  {!workEmailVerified ? (
                    <li className="rounded-md border border-line bg-surface-1 px-3 py-2">
                      Email verification
                    </li>
                  ) : null}
                  {missingRequiredFields.length === 0 && workEmailVerified ? (
                    <li className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-state-success">
                      Core publish requirements are complete.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Recommended improvements
                </p>
                <ul className="space-y-1 text-sm text-text-muted">
                  {recommendationChecks.map((item) => (
                    <li
                      key={item.key}
                      className={cn(
                        "rounded-md border px-3 py-2",
                        item.done
                          ? "border-state-success/20 bg-state-success/10 text-state-success"
                          : "border-line bg-surface-1"
                      )}
                    >
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>

              {lowConfidenceFields.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Confirm these details
                  </p>
                  <ul className="space-y-1 text-sm text-text-muted">
                    {lowConfidenceFields.map((item) => (
                      <li
                        key={item.key}
                        className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2"
                      >
                        <span className="font-medium text-text-strong">{item.label}</span>
                        {item.evidence ? ` — “${item.evidence}”` : ""}
                        {` (${item.score}% confidence)`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link href="#confirm-details" className={cn(buttonVariants({ variant: "primary" }))}>
                  Confirm extracted details
                </Link>
                <Link href="/agent/profile/edit" className={cn(buttonVariants({ variant: "secondary" }))}>
                  Open full profile editor
                </Link>
              </div>
            </Card>

            <Card className="space-y-3" id="verification-gate">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Publish gate
                  </p>
                  <h3 className="text-base font-semibold text-text-strong">Email verification</h3>
                </div>
                <Badge variant={workEmailVerified ? "success" : "warning"}>
                  {workEmailVerified ? "Verified" : "Not verified"}
                </Badge>
              </div>
              <p className="text-sm text-text-muted">
                Verification stays quiet until publish. Complete it now or just
                before making your profile public.
              </p>

              <form className="space-y-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">Email for verification</span>
                  <Input name="workEmail" type="email" required defaultValue={defaultWorkEmail} />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-text-strong">Verification code</span>
                  <Input
                    name="verificationCode"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" formAction={sendWorkEmailVerificationCodeAction}>
                    Send code
                  </Button>
                  <Button type="submit" variant="secondary" formAction={confirmWorkEmailVerificationCodeAction}>
                    Verify
                  </Button>
                </div>
              </form>

              {devCode ? (
                <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-xs text-state-warning">
                  Dev verification code: {devCode}
                </p>
              ) : null}
            </Card>

            <Card>
              <ActivationChecklist
                profile={profile}
                title="Profile milestones"
                description="Move from draft to a shareable, verified profile in five clear milestones."
              />
            </Card>
          </div>
        </div>

        <Card id="confirm-details" className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
              Confirm extracted details
            </p>
            <h3 className="text-lg font-semibold text-text-strong">
              Help us finish your profile
            </h3>
            <p className="text-sm text-text-muted">
              Review what we captured and fill any remaining fields. This is
              the only step that writes onboarding details to your profile.
            </p>
          </div>

          <form action={submitAgentOnboardingAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Full name</span>
                <Input name="fullName" required defaultValue={defaultFullName} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Email</span>
                <Input name="workEmail" type="email" required defaultValue={defaultWorkEmail} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Phone</span>
                <Input name="phone" required defaultValue={defaultPhone} placeholder="+44..." />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Agency</span>
                <Input
                  name="agencyName"
                  required
                  defaultValue={defaultAgencyName}
                  placeholder="Example Estates"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Job title</span>
                <Input
                  name="jobTitle"
                  required
                  defaultValue={defaultJobTitle}
                  placeholder="Senior Sales Negotiator"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Years experience</span>
                <Input
                  name="yearsExperience"
                  type="number"
                  min={0}
                  max={60}
                  required
                  defaultValue={defaultYearsExperience}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">
                  Service areas (postcode districts, comma-separated)
                </span>
                <Input
                  name="serviceAreas"
                  required
                  defaultValue={defaultServiceAreas}
                  placeholder="SW1A, SE1, E14"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Specialties (comma-separated)</span>
                <Input
                  name="specialties"
                  required
                  defaultValue={defaultSpecialties}
                  placeholder="First-time buyers, Luxury homes, Investment sales"
                />
              </label>
            </div>

            <label id="bio-field" className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Professional summary</span>
              <Textarea
                name="bio"
                required
                placeholder="Describe your estate agency track record, approach, and what homeowners can expect when working with you."
                defaultValue={defaultBio}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Save profile draft</Button>
              <Link href="/agent/profile/edit" className={cn(buttonVariants({ variant: "secondary" }))}>
                Go to full profile editor
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
