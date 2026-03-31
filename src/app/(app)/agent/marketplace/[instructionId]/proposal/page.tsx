import type { ReactElement } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ProposalBuilderClient } from "./proposal-builder-client";

interface PageProps {
  params: Promise<{ instructionId: string }>;
}

export default async function ProposalBuilderPage({
  params
}: PageProps): Promise<ReactElement> {
  const { instructionId } = await params;

  return (
    <AppShell role="AGENT" title="Submit Proposal">
      <ProposalBuilderClient instructionId={instructionId} />
    </AppShell>
  );
}
