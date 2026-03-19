import { FormStepper } from "@/components/form-stepper";
import { AppShell } from "@/components/layout/app-shell";
import { ProposalCard } from "@/components/proposal-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { proposalInclusionLabels, proposalInclusions } from "@/lib/validation/proposal";

interface PageProps {
  params: Promise<{ instructionId: string }>;
}

const proposalSteps = ["Commercials", "Service scope", "Terms & submit"] as const;

export default async function ProposalBuilderPage({ params }: PageProps): Promise<JSX.Element> {
  const { instructionId } = await params;

  return (
    <AppShell role="AGENT" title="Submit Proposal">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Instruction {instructionId}</p>
            <h2 className="text-lg">Proposal Builder</h2>
            <p className="text-sm text-text-muted">Structured real estate agent proposal form with live preview and server-side validation.</p>
          </div>

          <FormStepper steps={proposalSteps} currentStep={1} />

          <form className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Fee model</span>
                <Input placeholder="FIXED / PERCENT / HYBRID / SUCCESS_BANDS" />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-text-strong">Fee value (GBP or %)</span>
                <Input type="number" min={0} step="0.01" placeholder="1250" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-text-strong">Timeline (days)</span>
                <Input type="number" min={1} max={365} placeholder="42" />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-text-strong">Inclusions (structured schema)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {proposalInclusions.map((key) => (
                  <label key={key} className="flex items-start gap-2 rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-text-base">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-line text-brand-accent focus:ring-brand-accent" defaultChecked={key === "PROFESSIONAL_PHOTOGRAPHY" || key === "FLOORPLAN"} />
                    <span>{proposalInclusionLabels[key]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Marketing plan</span>
              <Textarea placeholder="Explain launch strategy, portal timing, viewings coverage, and communication cadence..." />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-text-strong">Cancellation terms</span>
              <Textarea placeholder="State sole agency period, notice, and any withdrawal terms clearly." />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Submit Proposal</Button>
              <Button variant="secondary">Save Draft</Button>
              <Button variant="tertiary">Ask a question (chat gated)</Button>
            </div>
          </form>
        </Card>

        <ProposalCard
          title="Live Preview"
          proposal={{
            agentName: "Your Agency",
            verificationStatus: "PENDING",
            feeModel: "FIXED",
            feeValue: 1250,
            timelineDays: 42,
            inclusions: ["Professional photography", "Floorplan", "Portal listings"],
            marketingPlan: "Portal launch in week one with accompanied viewings and weekly vendor reporting.",
            cancellationTerms: "8-week sole agency term followed by rolling 14-day notice."
          }}
        />
      </div>
    </AppShell>
  );
}
