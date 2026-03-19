import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { assertCan } from "@/lib/auth/rbac";
import { agentOnboardingSchema, parseCsvList } from "@/lib/validation/agent-profile";
import { getAgentProfileByUserId, completeAgentOnboarding } from "@/server/agent-profile/service";

interface PageProps {
  searchParams?: Promise<{ error?: string; success?: string }>;
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

  await completeAgentOnboarding(session.user.id, parsed.data);
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

  return (
    <AppShell role="AGENT" title="Real Estate Agent Onboarding">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Phase 1 pilot onboarding</p>
            <h2 className="text-lg font-semibold text-text-strong">Build your professional identity profile</h2>
            <p className="text-sm text-text-muted">
              This creates your verified professional baseline on WHOMA. We use this to generate your public profile and include you in the agent directory.
            </p>
          </div>

          {error === "invalid_fields" ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              Check your inputs. Use postcode districts like SW1A and provide meaningful professional details.
            </p>
          ) : null}

          {success ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Onboarding details saved. Continue refining your public profile.
            </p>
          ) : null}

          <form action={submitAgentOnboardingAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Full name</span>
                <Input name="fullName" required defaultValue={session.user.name ?? ""} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Work email</span>
                <Input name="workEmail" type="email" required defaultValue={profile?.workEmail ?? session.user.email ?? ""} />
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
            <li className="rounded-md border border-line bg-surface-1 px-3 py-2">1. Complete onboarding details and verification baseline.</li>
            <li className="rounded-md border border-line bg-surface-1 px-3 py-2">2. Add CV details (achievements, languages, positioning).</li>
            <li className="rounded-md border border-line bg-surface-1 px-3 py-2">3. Publish your profile and appear in the WHOMA agent directory.</li>
          </ol>
        </Card>
      </div>
    </AppShell>
  );
}
import { cn } from "@/lib/utils";
