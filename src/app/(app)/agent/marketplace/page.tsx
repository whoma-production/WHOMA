import { AppShell } from "@/components/layout/app-shell";
import { InstructionCard, type InstructionCardModel } from "@/components/instruction-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mockLiveInstructions } from "@/lib/mock/live-instructions";

export default function AgentMarketplacePage(): JSX.Element {
  const mockInstructions: InstructionCardModel[] = mockLiveInstructions;

  return (
    <AppShell role="AGENT" title="Marketplace">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">LIVE Instructions</h2>
            <p className="text-sm text-text-muted">Filter by postcode district, property type, and bedrooms. Primary CTA is structured real estate agent proposal submission.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Postcode district</span>
              <Input placeholder="e.g. SW1A" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Property type</span>
              <Input placeholder="Flat / Terraced / Detached" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Bedrooms</span>
              <Input type="number" min={0} placeholder="2" />
            </label>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {mockInstructions.map((instruction) => (
            <InstructionCard key={instruction.id} instruction={instruction} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
