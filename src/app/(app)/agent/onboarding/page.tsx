import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { assertCan } from "@/lib/auth/rbac";
import {
  agentOnboardingSchema,
  agentWorkEmailVerificationConfirmSchema,
  agentWorkEmailVerificationSendSchema,
  parseCsvList
} from "@/lib/validation/agent-profile";
import { cn } from "@/lib/utils";
import {
  WorkEmailVerificationError,
  completeAgentOnboarding,
  confirmAgentWorkEmailVerificationCode,
  getAgentProfileByUserId,
  isAgentWorkEmailVerified,
  requestAgentWorkEmailVerificationCode
} from "@/server/agent-profile/service";

interface PageProps {
  searchParams?: Promise<{ error?: string; success?: string; devCode?: string }>;
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
  }
}

async function sendWorkEmailVerificationCodeAction(formData: FormData): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/onboarding");
  }

  assertCan(session.user.role, "agent:profile:onboard");

  const parsed = agentWorkEmailVerificationSendSchema.safeParse({
    workEmail: formData.get("workEmail")
  });

  if (!parsed.success) {
    redirect("/agent/onboarding?error=work_email_not_business");
  }

  let result: Awaited<ReturnType<typeof requestAgentWorkEmailVerificationCode>> | null = null;

  try {
    result = await requestAgentWorkEmailVerificationCode(session.user.id, parsed.data.workEmail);
  } catch {
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
      redirect(`/agent/onboarding?error=${mapWorkEmailVerificationErrorToQuery(error)}`);
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
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = resolvedSearchParams?.error;
  const success = resolvedSearchParams?.success;
  const devCode = resolvedSearchParams?.devCode;
  const defaultWorkEmail = profile?.workEmail ?? session.user.email ?? "";
  const workEmailVerified = Boolean(profile?.workEmailVerifiedAt);

  return (
    <AppShell role="AGENT" title="Real Estate Agent Onboarding">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Phase 1 pilot onboarding</p>
            <h2 className="text-lg font-semibold text-text-strong">Build your professional identity profile</h2>
            <p className="text-sm text-text-muted">
              This creates your verified professional baseline on WHOMA. Verify your business work email first, then complete your guided profile details.
            </p>
          </div>

          {error === "invalid_fields" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Check your inputs. Use postcode districts like SW1A and provide meaningful professional details.
            </p>
          ) : null}

          {error === "complete_onboarding_first" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Complete onboarding before opening the CV builder.
            </p>
          ) : null}

          {error === "work_email_not_business" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Use your business work email. Personal email domains are not accepted.
            </p>
          ) : null}

          {error === "work_email_unverified" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Verify your business work email before completing onboarding.
            </p>
          ) : null}

          {error === "work_email_code_send_failed" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              We could not send a verification code right now. Please try again.
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

          {devCode ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Development verification code: <span className="font-semibold">{devCode}</span>
            </p>
          ) : null}

          <Card className="space-y-3 bg-surface-1">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-strong">Business work email verification</p>
              <p className="text-xs text-text-muted">
                Status:{" "}
                <span className="font-semibold text-text-strong">{workEmailVerified ? "VERIFIED" : "NOT VERIFIED"}</span>
              </p>
            </div>

            <form className="space-y-3">
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Work email for verification</span>
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
                <Input name="fullName" required defaultValue={session.user.name ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Work email</span>
                <Input name="workEmail" type="email" required defaultValue={defaultWorkEmail} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Phone</span>
                <Input name="phone" required defaultValue={profile?.phone ?? ""} placeholder="+44..." />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Agency</span>
                <Input name="agencyName" required defaultValue={profile?.agencyName ?? ""} placeholder="Example Estates" />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Job title</span>
                <Input name="jobTitle" required defaultValue={profile?.jobTitle ?? ""} placeholder="Senior Sales Negotiator" />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Years experience</span>
                <Input name="yearsExperience" type="number" min={0} max={60} required defaultValue={profile?.yearsExperience ?? ""} />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Service areas (postcode districts, comma-separated)</span>
                <Input
                  name="serviceAreas"
                  required
                  defaultValue={profile?.serviceAreas.join(", ") ?? ""}
                  placeholder="SW1A, SE1, E14"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Specialties (comma-separated)</span>
                <Input
                  name="specialties"
                  required
                  defaultValue={profile?.specialties.join(", ") ?? ""}
                  placeholder="First-time buyers, Luxury homes, Investment sales"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Professional summary</span>
              <Textarea
                name="bio"
                required
                placeholder="Describe your real estate track record, approach, and what homeowners can expect when working with you."
                defaultValue={profile?.bio ?? ""}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Save onboarding details</Button>
              <Link href="/agent/profile/edit" className={cn(buttonVariants({ variant: "secondary" }))}>
                Go to CV builder
              </Link>
            </div>
          </form>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-text-strong">What happens next</h3>
            <p className="mt-1 text-sm text-text-muted">After onboarding, refine your full CV, then publish your profile in the public directory.</p>
          </div>
          <ol className="space-y-2 text-sm text-text-muted">
            <li className="rounded-md border border-line bg-surface-1 px-3 py-2">1. Verify your business work email and complete onboarding details.</li>
            <li className="rounded-md border border-line bg-surface-1 px-3 py-2">2. Add CV details (achievements, languages, positioning).</li>
            <li className="rounded-md border border-line bg-surface-1 px-3 py-2">3. Publish your profile and appear in the WHOMA agent directory once verified.</li>
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}
