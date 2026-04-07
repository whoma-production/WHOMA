import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ActivationChecklist } from "@/components/agent/activation-checklist";
import { AppShell } from "@/components/layout/app-shell";
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
      return "resume_file_missing";
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

function countResumePrefillFields(prefill?: ResumePrefillValues): number {
  if (!prefill) {
    return 0;
  }

  let count = 0;
  for (const value of Object.values(prefill)) {
    if (Array.isArray(value)) {
      count += value.length > 0 ? 1 : 0;
      continue;
    }

    count += value ? 1 : 0;
  }

  return count;
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
  if (!(uploadedResume instanceof File)) {
    redirect("/agent/onboarding?error=resume_file_missing");
  }

  const rawMode = formData.get("mode");
  let mode: Parameters<typeof createResumeSuggestionsFromFile>[0]["mode"];
  if (rawMode === "heuristic" || rawMode === "hybrid" || rawMode === "llm_only") {
    mode = rawMode;
  }

  let suggestionResult: Awaited<ReturnType<typeof createResumeSuggestionsFromFile>>;
  try {
    const extractionInput = mode
      ? { file: uploadedResume, mode }
      : { file: uploadedResume };
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
  const resumePrefillCount = countResumePrefillFields(suggestedPrefill);

  return (
    <AppShell role="AGENT" title="Agent Onboarding">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Agent onboarding</p>
            <h2 className="text-lg font-semibold text-text-strong">Verify your work email and complete your profile</h2>
            <p className="text-sm text-text-muted">
              This creates your professional baseline on WHOMA. Verify your
              work email first, then complete your core profile
              details.
            </p>
          </div>

          {error === "invalid_fields" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Check your inputs. Use postcode districts like SW1A and provide meaningful professional details.
            </p>
          ) : null}

          {error === "resume_file_missing" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Choose a resume file before uploading.
            </p>
          ) : null}

          {error === "resume_file_empty" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              The uploaded file was empty.
            </p>
          ) : null}

          {error === "resume_file_too_large" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Resume files must be 4 MB or smaller.
            </p>
          ) : null}

          {error === "resume_file_unsupported" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Upload a PDF, DOCX, TXT, MD, or RTF resume.
            </p>
          ) : null}

          {error === "resume_file_parse_failed" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              We could not read that resume file. Try a different export or file format.
            </p>
          ) : null}

          {error === "resume_file_text_short" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              We extracted too little text to build useful suggestions.
            </p>
          ) : null}

          {error === "resume_file_no_suggestions" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              We read the resume, but could not confidently map any onboarding fields.
            </p>
          ) : null}

          {error === "resume_llm_unavailable" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              AI extraction is temporarily unavailable. We will continue with deterministic resume parsing.
            </p>
          ) : null}

          {error === "resume_ocr_unavailable" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              OCR fallback is unavailable for this file right now. Try a text-based PDF/DOCX export or retry later.
            </p>
          ) : null}

          {error === "resume_upload_rate_limited" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Too many resume uploads from your session.
              {retryAfterSeconds ? ` Please retry in about ${retryAfterSeconds} seconds.` : " Please retry shortly."}
            </p>
          ) : null}

          {error === "complete_onboarding_first" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Complete onboarding before opening your profile.
            </p>
          ) : null}

          {error === "work_email_invalid" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Enter a valid email address before requesting a verification code.
            </p>
          ) : null}

          {error === "work_email_unverified" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Verify your work email before completing onboarding.
            </p>
          ) : null}

          {error === "work_email_code_send_failed" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              We could not send a verification code right now. Please try again.
            </p>
          ) : null}

          {error === "work_email_delivery_unavailable" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Verification email delivery is temporarily unavailable. Please try again shortly.
            </p>
          ) : null}

          {error === "work_email_code_not_requested" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Request a verification code before trying to verify your work email.
            </p>
          ) : null}

          {error === "work_email_code_expired" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Your verification code expired. Request a new code and try again.
            </p>
          ) : null}

          {error === "work_email_code_invalid" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              The verification code is invalid. Enter the latest 6-digit code sent to your work email.
            </p>
          ) : null}

          {error === "work_email_code_email_mismatch" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              That code was requested for a different work email. Use the same work email for send and verify.
            </p>
          ) : null}

          {error === "work_email_resend_cooldown" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Please wait before requesting another code.
              {retryAfterSeconds ? ` Try again in about ${retryAfterSeconds} seconds.` : ""}
            </p>
          ) : null}

          {error === "work_email_attempts_exceeded" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Too many incorrect verification attempts. Request a new code after the lock period.
            </p>
          ) : null}

          {error === "work_email_rate_limited" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Too many verification requests from your session.
              {retryAfterSeconds ? ` Please retry in about ${retryAfterSeconds} seconds.` : " Please retry shortly."}
            </p>
          ) : null}

          {success === "work_email_code_sent" ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Verification code sent. Enter the 6-digit code to verify your work email.
            </p>
          ) : null}

          {success === "work_email_verified" ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Work email verified. You can now complete onboarding.
            </p>
          ) : null}

          {success === "resume_prefilled" ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Resume suggestions extracted. Review the prefilled fields before saving.
            </p>
          ) : null}

          {success === "resume_prefill_cleared" ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Resume suggestions cleared.
            </p>
          ) : null}

          <Card className="space-y-3 bg-surface-1">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-strong">Resume auto-fill</p>
              <p className="text-xs text-text-muted">
                Upload a resume and we’ll extract suggestions server-side. Nothing is saved automatically, and you still review every field before submitting onboarding.
              </p>
            </div>

            {resumeSuggestions ? (
              <div className="space-y-3 rounded-md border border-line bg-surface-0 px-3 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-strong">Suggested from {resumeSuggestions.sourceFileName}</p>
                  <p className="text-xs text-text-muted">
                    Extracted from {resumeSuggestions.sourceMimeType}.{resumePrefillCount > 0 ? ` Prefilled ${resumePrefillCount} field${resumePrefillCount === 1 ? "" : "s"}.` : ""}
                  </p>
                </div>
                <p className="text-sm text-text-muted">{resumeSuggestions.summary}</p>
                {resumeSuggestions.highlights.length > 0 ? (
                  <ul className="space-y-1 text-xs text-text-muted">
                    {resumeSuggestions.highlights.map((highlight) => (
                      <li key={highlight} className="rounded-md border border-line bg-surface-1 px-2 py-1">
                        {highlight}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {resumeSuggestions.warnings.length > 0 ? (
                  <ul className="space-y-1 text-xs text-state-warning">
                    {resumeSuggestions.warnings.map((warning) => (
                      <li key={warning} className="rounded-md border border-state-warning/20 bg-state-warning/10 px-2 py-1">
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
            ) : null}

            <form action={uploadResumeAction} encType="multipart/form-data" className="space-y-3">
              <input type="hidden" name="mode" value={resumeFlags.resumePrefillMode} />
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Resume file</span>
                <Input
                  name="resumeFile"
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.markdown,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/rtf,application/rtf"
                  required
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Upload and extract suggestions</Button>
              </div>
            </form>
          </Card>

          <Card className="space-y-3 bg-surface-1">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-strong">Email verification</p>
              <p className="text-xs text-text-muted">
                Status:{" "}
                <span className="font-semibold text-text-strong">{workEmailVerified ? "VERIFIED" : "NOT VERIFIED"}</span>
              </p>
            </div>

            <form className="space-y-3">
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Email for verification</span>
                <Input name="workEmail" type="email" required defaultValue={defaultWorkEmail} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Verification code</span>
                <Input name="verificationCode" inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="123456" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" formAction={sendWorkEmailVerificationCodeAction}>
                  Send verification code
                </Button>
                <Button type="submit" variant="secondary" formAction={confirmWorkEmailVerificationCodeAction}>
                  Verify work email
                </Button>
              </div>
            </form>
          </Card>

          <form action={submitAgentOnboardingAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Full name</span>
                <Input name="fullName" required defaultValue={defaultFullName} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Work email</span>
                <Input name="workEmail" type="email" required defaultValue={defaultWorkEmail} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Phone</span>
                <Input name="phone" required defaultValue={defaultPhone} placeholder="+44..." />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Agency</span>
                <Input name="agencyName" required defaultValue={defaultAgencyName} placeholder="Example Estates" />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Job title</span>
                <Input name="jobTitle" required defaultValue={defaultJobTitle} placeholder="Senior Sales Negotiator" />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Years experience</span>
                <Input name="yearsExperience" type="number" min={0} max={60} required defaultValue={defaultYearsExperience} />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Service areas (postcode districts, comma-separated)</span>
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

            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Professional summary</span>
              <Textarea
                name="bio"
                required
                placeholder="Describe your estate agency track record, approach, and what homeowners can expect when working with you."
                defaultValue={defaultBio}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Save onboarding details</Button>
              <Link href="/agent/profile/edit" className={cn(buttonVariants({ variant: "secondary" }))}>
                Go to profile
              </Link>
            </div>
          </form>
        </Card>

        <Card className="space-y-4">
          <ActivationChecklist
            profile={profile}
            description={`Complete the five steps required for public visibility: verify your email, finish onboarding, reach ${MIN_AGENT_PUBLISH_COMPLETENESS}% readiness, publish, and pass review.`}
          />
        </Card>
      </div>
    </AppShell>
  );
}
