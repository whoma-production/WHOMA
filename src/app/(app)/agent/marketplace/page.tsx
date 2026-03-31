import type { ReactElement } from "react";

import { AppShell } from "@/components/layout/app-shell";
import {
  InstructionCard,
  type InstructionCardModel
} from "@/components/instruction-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getLiveInstructionCards,
  type LiveInstructionFilters
} from "@/server/marketplace/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: Promise<{
    postcodeDistrict?: string;
    propertyType?: string;
    bedrooms?: string;
  }>;
}

export default async function AgentMarketplacePage({
  searchParams
}: PageProps): Promise<ReactElement> {
  const params = (searchParams ? await searchParams : undefined) ?? {};
  const bedroomsRaw = params.bedrooms?.trim();
  const bedrooms =
    bedroomsRaw && /^\d+$/.test(bedroomsRaw) ? Number(bedroomsRaw) : undefined;

  const filters: LiveInstructionFilters = {};
  if (params.postcodeDistrict?.trim()) {
    filters.postcodeDistrict = params.postcodeDistrict.trim();
  }
  if (params.propertyType?.trim()) {
    filters.propertyType = params.propertyType.trim();
  }
  if (bedrooms !== undefined) {
    filters.bedrooms = bedrooms;
  }

  const instructions: InstructionCardModel[] =
    await getLiveInstructionCards(filters);

  return (
    <AppShell role="AGENT" title="Marketplace">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">
              LIVE Instructions
            </h2>
            <p className="text-sm text-text-muted">
              Filter by postcode district, property type, and bedrooms. Primary
              CTA is structured real estate agent proposal submission.
            </p>
          </div>
          <form className="grid gap-3 md:grid-cols-3" method="GET">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Postcode district
              </span>
              <Input
                name="postcodeDistrict"
                placeholder="e.g. SW1A"
                defaultValue={params.postcodeDistrict ?? ""}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Property type
              </span>
              <Input
                name="propertyType"
                placeholder="Flat / Terraced / Detached"
                defaultValue={params.propertyType ?? ""}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Bedrooms
              </span>
              <Input
                name="bedrooms"
                type="number"
                min={0}
                placeholder="2"
                defaultValue={params.bedrooms ?? ""}
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button type="submit" size="sm">
                Apply filters
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                formAction="/agent/marketplace"
              >
                Clear filters
              </Button>
            </div>
          </form>
        </Card>

        {instructions.length === 0 ? (
          <Card className="border-dashed bg-surface-0">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-text-strong">
                No LIVE instructions right now
              </h2>
              <p className="text-sm text-text-muted">
                Active bid windows will appear here automatically. If the
                database is not configured yet, this page still renders with a
                usable empty state.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {instructions.map((instruction) => (
              <InstructionCard key={instruction.id} instruction={instruction} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
