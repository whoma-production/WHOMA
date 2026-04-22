import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignUpFlow } from "@/components/auth/sign-up-flow";
import {
  buildSupabaseAuthCallbackPath,
  hasSupabaseAuthReturnParams
} from "@/lib/auth/callback-return";

interface SignUpPageProps {
  searchParams?: Promise<{ role?: string }>;
}

function normalizeRole(value: string | undefined): "HOMEOWNER" | "AGENT" | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "HOMEOWNER") {
    return "HOMEOWNER";
  }

  if (normalized === "AGENT") {
    return "AGENT";
  }

  return null;
}

export default async function SignUpPage({
  searchParams
}: SignUpPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authReturnSearchParams =
    resolvedSearchParams as
      | Record<string, string | string[] | undefined>
      | undefined;

  if (hasSupabaseAuthReturnParams(authReturnSearchParams)) {
    redirect(
      buildSupabaseAuthCallbackPath(
        authReturnSearchParams ?? {}
      ) as Parameters<typeof redirect>[0]
    );
  }

  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <SignUpFlow initialRole={normalizeRole(resolvedSearchParams?.role)} />;
}
