import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { assertCan } from "@/lib/auth/rbac";
import {
  getAgentOnboardingFunnelCounts,
  listAgentProfilesForVerification,
  setAgentVerificationStatus
} from "@/server/agent-profile/service";

const verificationUpdateSchema = z.object({
  agentUserId: z.string().min(1),
  status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED"])
});

interface PageProps {
  searchParams?: Promise<{ success?: string; error?: string }>;
}

async function updateVerificationStatusAction(formData: FormData): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/sign-in?error=AccessDenied&next=/admin/agents");
  }

  assertCan(session.user.role, "admin:verify-agent");

  const parsed = verificationUpdateSchema.safeParse({
    agentUserId: formData.get("agentUserId"),
    status: formData.get("status")
  });

  if (!parsed.success) {
    redirect("/admin/agents?error=invalid_payload");
  }

  try {
    await setAgentVerificationStatus(parsed.data.agentUserId, parsed.data.status);
  } catch {
    redirect("/admin/agents?error=verification_requirements");
  }

  redirect("/admin/agents?success=verification_updated");
}

export default async function AdminAgentsPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/sign-in?error=AccessDenied&next=/admin/agents");
  }

  const [profiles, funnel] = await Promise.all([listAgentProfilesForVerification(), getAgentOnboardingFunnelCounts()]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const success = resolvedSearchParams?.success;
  const error = resolvedSearchParams?.error;

  return (
    <AppShell role="ADMIN" title="Real Estate Agent Verification">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">Onboarding readiness counters</h2>
            <p className="text-sm text-text-muted">Phase 1 pilot monitoring for the first 100 real estate agents.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Started</p>
              <p className="text-2xl font-semibold text-text-strong">{funnel.started}</p>
            </div>
            <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Completed</p>
              <p className="text-2xl font-semibold text-text-strong">{funnel.completed}</p>
            </div>
            <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Published</p>
              <p className="text-2xl font-semibold text-text-strong">{funnel.published}</p>
            </div>
            <div className="rounded-md border border-line bg-surface-1 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Verified</p>
              <p className="text-2xl font-semibold text-text-strong">{funnel.verified}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">Manual verification queue</h2>
            <p className="text-sm text-text-muted">Review profiles and update trust status shown on public pages and directory cards.</p>
          </div>

          {error ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
              {error === "verification_requirements"
                ? "Verification requires a published profile meeting completeness requirements."
                : "Verification update failed. Please try again."}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
              Verification status updated.
            </p>
          ) : null}

          <ul className="space-y-3">
            {profiles.map((profile) => (
              <li key={profile.userId} className="rounded-md border border-line bg-surface-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-text-strong">{profile.user.name ?? "Real estate agent"}</p>
                    <p className="text-sm text-text-muted">
                      {profile.agencyName ?? "Agency pending"} · {profile.jobTitle ?? "Role pending"}
                    </p>
                    <p className="text-xs text-text-muted">Areas: {profile.serviceAreas.join(", ") || "Not listed"}</p>
                  </div>
                  <Badge variant={profile.verificationStatus === "VERIFIED" ? "success" : profile.verificationStatus === "PENDING" ? "warning" : "default"}>
                    {profile.verificationStatus}
                  </Badge>
                </div>

                <form action={updateVerificationStatusAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="agentUserId" value={profile.userId} />
                  <Button type="submit" name="status" value="VERIFIED" size="sm">
                    Mark verified
                  </Button>
                  <Button type="submit" name="status" value="PENDING" size="sm" variant="secondary">
                    Mark pending
                  </Button>
                  <Button type="submit" name="status" value="UNVERIFIED" size="sm" variant="tertiary">
                    Mark unverified
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
