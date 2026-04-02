import Link from "next/link";
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
import { agentProfileDraftSchema, agentProfilePublishSchema, parseCsvList } from "@/lib/validation/agent-profile";
import { cn } from "@/lib/utils";
import {
  WorkEmailVerificationError,
  getAgentProfileByUserId,
  publishAgentProfile,
  saveAgentProfileDraft
} from "@/server/agent-profile/service";

interface PageProps {
  searchParams?: Promise<{ error?: string; success?: string; slug?: string }>;
}

function parseProfilePayload(formData: FormData): unknown {
  return {
    agencyName: formData.get("agencyName"),
    jobTitle: formData.get("jobTitle"),
    workEmail: formData.get("workEmail"),
    phone: formData.get("phone"),
    yearsExperience: formData.get("yearsExperience"),
    bio: formData.get("bio"),
    serviceAreas: parseCsvList(formData.get("serviceAreas")?.toString()),
    specialties: parseCsvList(formData.get("specialties")?.toString()),
    achievements: parseCsvList(formData.get("achievements")?.toString()),
    languages: parseCsvList(formData.get("languages")?.toString())
  };
}

async function saveAgentProfileDraftAction(formData: FormData): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/profile/edit");
  }

  assertCan(session.user.role, "agent:profile:edit");

  const parsed = agentProfileDraftSchema.safeParse(parseProfilePayload(formData));

  if (!parsed.success) {
    redirect("/agent/profile/edit?error=invalid_fields");
  }

  await saveAgentProfileDraft(session.user.id, parsed.data);
  redirect("/agent/profile/edit?success=draft-saved");
}

async function publishAgentProfileAction(formData: FormData): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/profile/edit");
  }

  assertCan(session.user.role, "agent:profile:publish");

  const parsed = agentProfilePublishSchema.safeParse(parseProfilePayload(formData));

  if (!parsed.success) {
    redirect("/agent/profile/edit?error=publish_requirements");
  }

  let profile: Awaited<ReturnType<typeof publishAgentProfile>> | null = null;

  try {
    profile = await publishAgentProfile(session.user.id, parsed.data);
  } catch (error) {
    if (error instanceof WorkEmailVerificationError && error.code === "EMAIL_NOT_VERIFIED") {
      redirect("/agent/profile/edit?error=publish_work_email_unverified");
    }

    redirect("/agent/profile/edit?error=publish_blocked");
  }

  if (!profile) {
    redirect("/agent/profile/edit?error=publish_blocked");
  }

  redirect(`/agent/profile/edit?success=published&slug=${profile.profileSlug ?? ""}`);
}

export default async function AgentProfileEditPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?next=/agent/profile/edit");
  }

  if (session.user.role !== "AGENT") {
    redirect("/onboarding/role?error=invalid_role");
  }

  const profile = await getAgentProfileByUserId(session.user.id);
  if (!profile?.onboardingCompletedAt) {
    redirect("/agent/onboarding?error=complete_onboarding_first");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const error = resolvedSearchParams?.error;
  const success = resolvedSearchParams?.success;
  const slug = resolvedSearchParams?.slug ?? profile?.profileSlug ?? undefined;

  return (
    <AppShell role="AGENT" title="Your Profile">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Professional identity</p>
            <h2 className="text-lg font-semibold text-text-strong">Build your public estate agent profile</h2>
            <p className="text-sm text-text-muted">
              Build the profile clients and partners will see on WHOMA. Save
              drafts as you go, then publish when ready.
            </p>
          </div>

          {error === "invalid_fields" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              We could not save your draft. Check required fields and postcode district formatting.
            </p>
          ) : null}

          {error === "publish_requirements" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Publishing failed because required profile fields are incomplete.
            </p>
          ) : null}

          {error === "publish_blocked" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Your profile completeness is below the publish threshold. Add more detail and try again.
            </p>
          ) : null}

          {error === "publish_work_email_unverified" ? (
            <p className="rounded-md border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-sm text-state-warning">
              Verify your business work email on onboarding before publishing your profile.
            </p>
          ) : null}

          {success === "draft-saved" ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Draft saved successfully.
            </p>
          ) : null}

          {success === "published" ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Profile published. It remains visible while your verification
              status stays approved.
            </p>
          ) : null}

          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Agency</span>
                <Input name="agencyName" required defaultValue={profile?.agencyName ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Job title</span>
                <Input name="jobTitle" required defaultValue={profile?.jobTitle ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Work email</span>
                <Input name="workEmail" type="email" required defaultValue={profile?.workEmail ?? session.user.email ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Phone</span>
                <Input name="phone" required defaultValue={profile?.phone ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Years experience</span>
                <Input name="yearsExperience" type="number" min={0} max={60} defaultValue={profile?.yearsExperience ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Service areas (postcode districts)</span>
                <Input
                  name="serviceAreas"
                  required
                  defaultValue={profile?.serviceAreas.join(", ") ?? ""}
                  placeholder="SW1A, SW3, SE1"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Specialties</span>
                <Input
                  name="specialties"
                  required
                  defaultValue={profile?.specialties.join(", ") ?? ""}
                  placeholder="Prime sales, New build, Family homes"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Achievements</span>
                <Input
                  name="achievements"
                  defaultValue={profile?.achievements.join(", ") ?? ""}
                  placeholder="Top branch negotiator 2024, £18m annual sales volume"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Languages</span>
                <Input
                  name="languages"
                  defaultValue={profile?.languages.join(", ") ?? ""}
                  placeholder="English, French, Arabic"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Professional summary</span>
              <Textarea
                name="bio"
                placeholder="Describe your local market knowledge, sales style, and communication approach for homeowners."
                defaultValue={profile?.bio ?? ""}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button formAction={saveAgentProfileDraftAction} type="submit">
                Save draft
              </Button>
              <Button formAction={publishAgentProfileAction} type="submit" variant="secondary">
                Publish profile
              </Button>
              <Link href="/agent/onboarding" className={cn(buttonVariants({ variant: "tertiary" }))}>
                Back to onboarding
              </Link>
              {slug && profile?.verificationStatus === "VERIFIED" ? (
                <Link href={`/agents/${slug}`} className={cn(buttonVariants({ variant: "tertiary" }))}>
                  View public profile
                </Link>
              ) : null}
            </div>
          </form>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-text-strong">Profile readiness</h3>
            <p className="mt-1 text-sm text-text-muted">
              Publishing requires at least {MIN_AGENT_PUBLISH_COMPLETENESS}% completeness and core professional fields.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-semibold text-text-strong">{profile?.profileCompleteness ?? 0}%</p>
            <p className="text-sm text-text-muted">
              Status: <span className="font-medium text-text-strong">{profile?.profileStatus ?? "DRAFT"}</span>
            </p>
            <p className="text-sm text-text-muted">
              Verification: <span className="font-medium text-text-strong">{profile?.verificationStatus ?? "UNVERIFIED"}</span>
            </p>
          </div>
          <ActivationChecklist
            profile={profile}
            description="Use your profile to reach the publish threshold, then wait for review to unlock public visibility."
          />
        </Card>
      </div>
    </AppShell>
  );
}
