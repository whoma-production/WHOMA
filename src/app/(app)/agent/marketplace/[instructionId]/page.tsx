import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ instructionId: string }>;
}

export default async function AgentInstructionDetailPage({
  params
}: PageProps): Promise<never> {
  const { instructionId } = await params;

  redirect(`/agent/marketplace/${instructionId}/proposal`);
}
