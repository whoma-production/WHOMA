import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AgentOnboardingStepper } from "./agent-onboarding-stepper";
import { assertCan } from "@/lib/auth/rbac";
import {
  agentOnboardingSchema,
  agentWorkEmailVerificationConfirmSchema,
  agentWorkEmailVerificationSendSchema,
  parseCsvList
} from "@/lib/validation/agent-profile";
import { createResumeSuggestionsFromFile } from "@/server/agent-profile/resume-ai";
import { getResumeFeatureFlags } from "@/server/agent-profile/resume-flags";
import { ResumeExtractionError } from "@/server/agent-profile/resume-intake";
import {
  decodeResumeSuggestionsCookie,
  encodeResumeSuggestionsCookie,
  RESUME_SUGGESTIONS_COOKIE_MAX_AGE_SECONDS,
  RESUME_SUGGESTIONS_COOKIE_NAME
} from "@/server/agent-profile/resume-suggestions-cookie";
import {
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

function isFileLike(value: FormDataEntryValue | null): value is File {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    name?: unknown;
    size?: unknown;
    type?: unknown;
    arrayBuffer?: unknown;
  };

  return (
    typeof candidate.name === "string" &&
    typeof candidate.size === "number" &&
    candidate.size > 0 &&
    typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function"
  );
}

function formatCsvDefault(values?: string[] | null): string {
  return values?.length ? values.join(", ") : "";
}

type NoticeTone = "danger" | "warning" | "success";

interface NoticeMessage {
  tone: NoticeTone;
  message: string;
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
    isFileLike(uploadedResume)
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

  redirect("/agent/onboarding?success=resume_prefilled#draft-preview");
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

  if (profile?.onboardingCompletedAt) {
    redirect("/agent/profile/edit");
  }

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
  const defaultCollaborationPreference = profile?.collaborationPreference ?? "";
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

  const formValues = {
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

  const agentCodePreview = (profile?.profileSlug ?? session.user.id)
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 10)
    .toUpperCase();


  return (
    <AgentOnboardingStepper
      userId={session.user.id}
      draftSourceKey={
        resumeSuggestions?.suggestionId ??
        profile?.updatedAt?.toISOString() ??
        "manual"
      }
      resumeMode={resumeFlags.resumePrefillMode}
      formValues={formValues}
      resumeConfidence={resumeSuggestions?.confidence ?? {}}
      hasResumeSuggestions={Boolean(resumeSuggestions)}
      workEmailVerified={workEmailVerified}
      initialVerificationSent={success === "work_email_code_sent"}
      agentCodePreview={agentCodePreview}
      notice={onboardingNotice}
      devCode={devCode}
      uploadResumeAction={uploadResumeAction}
      clearResumeSuggestionsAction={clearResumeSuggestionsAction}
      sendWorkEmailVerificationCodeAction={sendWorkEmailVerificationCodeAction}
      confirmWorkEmailVerificationCodeAction={confirmWorkEmailVerificationCodeAction}
      submitAgentOnboardingAction={submitAgentOnboardingAction}
    />
  );
}
