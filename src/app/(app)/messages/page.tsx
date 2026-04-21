import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { MessagesClient } from "./messages-client";

interface MessagesPageProps {
  searchParams?: Promise<{
    threadId?: string;
    instructionId?: string;
  }>;
}

function normalizeQueryValue(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function MessagesPage({
  searchParams
}: MessagesPageProps): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?next=/messages");
  }

  if (!session.user.role) {
    redirect("/onboarding/role?next=/messages");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialThreadId = normalizeQueryValue(resolvedSearchParams?.threadId);
  const initialInstructionId = normalizeQueryValue(
    resolvedSearchParams?.instructionId
  );

  return (
    <AppShell role={session.user.role} title="Messages">
      <MessagesClient
        role={session.user.role}
        initialThreadId={initialThreadId}
        initialInstructionId={initialInstructionId}
      />
    </AppShell>
  );
}
