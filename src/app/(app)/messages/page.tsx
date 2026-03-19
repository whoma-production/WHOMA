import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MessagesPage(): JSX.Element {
  return (
    <AppShell role="HOMEOWNER" title="Messages">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">Threads</h2>
            <p className="text-sm text-text-muted">Threads unlock when an agent is shortlisted or awarded.</p>
          </div>
          <div className="space-y-3">
            <button type="button" className="w-full rounded-md border border-line bg-surface-1 p-3 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-text-strong">Northbank Estates</p>
                <Badge variant="success">OPEN</Badge>
              </div>
              <p className="mt-1 text-sm text-text-muted">Shortlisted · SW1A flat instruction</p>
            </button>
            <button type="button" className="w-full rounded-md border border-line bg-surface-0 p-3 text-left opacity-80 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-text-strong">Harbour & Co</p>
                <Badge variant="warning">LOCKED</Badge>
              </div>
              <p className="mt-1 text-sm text-text-muted">Submit shortlist to unlock chat</p>
            </button>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-strong">Northbank Estates</h2>
              <p className="text-sm text-text-muted">Shortlisted thread (unlock rule: shortlist or award)</p>
            </div>
            <Badge variant="success">OPEN</Badge>
          </div>
          <div className="space-y-3 rounded-lg border border-line bg-surface-1 p-4">
            <div className="max-w-[80%] rounded-md bg-surface-0 p-3 shadow-soft">
              <p className="text-sm text-text-base">Thanks for shortlisting us. We can confirm accompanied viewings from Saturday.</p>
            </div>
            <div className="ml-auto max-w-[80%] rounded-md bg-brand-accent/10 p-3">
              <p className="text-sm text-text-base">Great. Please clarify your cancellation terms after the initial sole-agency period.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1">Send message</Button>
            <Button variant="secondary">View proposal</Button>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <EmptyState
          title="No unlocked threads for other instructions"
          description="Messaging stays closed until shortlist/award to keep the proposal workflow structured and low-noise."
          ctaLabel="Review proposals"
        />
      </div>
    </AppShell>
  );
}
