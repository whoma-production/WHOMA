import { EmptyState } from "@/components/empty-state";
import { FormStepper } from "@/components/form-stepper";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineToast, InlineToastLabel } from "@/components/ui/inline-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const steps = ["Property basics", "Seller brief", "Launch bid window"] as const;

export default function CreateInstructionPage(): JSX.Element {
  return (
    <AppShell role="HOMEOWNER" title="Create Instruction">
      <div className="space-y-6">
        <InlineToast>
          <InlineToastLabel>Foundation</InlineToastLabel>
          <p className="text-sm text-text-muted">
            This screen is UI-first in this chunk. Next chunk will connect React Hook Form + Zod to server actions and Prisma.
          </p>
        </InlineToast>

        <Card className="space-y-5">
          <FormStepper steps={steps} currentStep={1} />

          <form className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-text-strong">Property address (line 1)</span>
              <Input placeholder="123 Example Street" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">City</span>
              <Input placeholder="London" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Postcode</span>
              <Input placeholder="SW1A 1AA" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Property type</span>
              <Input placeholder="Flat" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Bedrooms</span>
              <Input type="number" min={0} placeholder="2" />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-text-strong">Short property summary</span>
              <Textarea placeholder="Bright two-bedroom flat near transport links, recently renovated kitchen, chain-free seller..." />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-text-strong">Seller goals and must-haves</span>
              <Textarea placeholder="Need strong local buyer reach, accompanied viewings, and a realistic timeline to exchange..." />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Bid window (hours)</span>
              <Input type="number" min={24} max={48} defaultValue={24} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Timeline goal</span>
              <Input placeholder="ASAP / 4-8 weeks / Flexible" />
            </label>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit">Launch Instruction</Button>
              <Button variant="secondary">Save Draft</Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">Loading states preview</h2>
            <p className="text-sm text-text-muted">Skeleton patterns for list + compare screens.</p>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>

        <EmptyState
          title="No saved draft instructions yet"
          description="Drafts will appear here once autosave is wired. The infinity motif is intentionally subtle per the brand kit."
          ctaLabel="Start with a blank instruction"
        />
      </div>
    </AppShell>
  );
}
