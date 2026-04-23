import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AddDealForm } from "@/components/deals/AddDealForm";
import { AppShell } from "@/components/layout/app-shell";

export default async function AgentDealsPage(): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    redirect("/sign-in?error=AccessDenied&next=/agent/deals");
  }

  return (
    <AppShell role="AGENT" title="Past Deals">
      <div className="space-y-4">
        <p className="max-w-3xl text-sm text-text-muted">
          Add completed sales and request seller confirmation. Verified past
          deals become one of the strongest trust signals on your WHOMA profile.
        </p>
        <AddDealForm />
      </div>
    </AppShell>
  );
}
