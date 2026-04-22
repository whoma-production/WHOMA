import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  buildSupabaseAuthCallbackPath,
  hasSupabaseAuthReturnParams
} from "@/lib/auth/callback-return";

interface PageProps {
  searchParams?: Promise<{
    error?: string;
    reset?: string;
  }>;
}

export default async function SignInPage({
  searchParams
}: PageProps): Promise<JSX.Element> {
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

  return (
    <SignInForm
      oauthError={resolvedSearchParams?.error ?? null}
      resetStatus={resolvedSearchParams?.reset ?? null}
    />
  );
}
