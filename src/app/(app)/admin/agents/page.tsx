import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function AdminAgentsPage(): JSX.Element {
  return (
    <AppShell role="ADMIN" title="Agent Verification">
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-strong">Manual verification queue</h2>
          <p className="text-sm text-text-muted">Minimal admin workflow for MVP trust badges.</p>
        </div>
        <ul className="space-y-3">
          <li className="flex items-center justify-between rounded-md border border-line bg-surface-1 px-4 py-3">
            <div>
              <p className="font-medium text-text-strong">Harbour & Co</p>
              <p className="text-sm text-text-muted">Service areas: SW1A, SW3, W8</p>
            </div>
            <Badge variant="warning">PENDING</Badge>
          </li>
          <li className="flex items-center justify-between rounded-md border border-line bg-surface-1 px-4 py-3">
            <div>
              <p className="font-medium text-text-strong">Northbank Estates</p>
              <p className="text-sm text-text-muted">Service areas: SW1A, SE1, N1</p>
            </div>
            <Badge variant="success">VERIFIED</Badge>
          </li>
        </ul>
      </Card>
    </AppShell>
  );
}
