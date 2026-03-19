import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export default function AgentProposalsPage(): JSX.Element {
  return (
    <AppShell role="AGENT" title="My Proposals">
      <Card>
        <h2 className="text-lg font-semibold text-text-strong">Proposal pipeline</h2>
        <p className="mt-2 text-sm text-text-muted">
          Submitted/shortlisted/accepted real estate agent proposals will appear here once marketplace persistence is completed in Phase 2.
        </p>
      </Card>
    </AppShell>
  );
}
