import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  buildSupabaseAuthCallbackPath,
  hasSupabaseAuthReturnParams
} from "@/lib/auth/callback-return";
import { getPublicAuthProviderAvailability } from "@/lib/auth/provider-config";
import { normalizeRedirectPath } from "@/lib/auth/session";

interface PageProps {
  searchParams?: Promise<{
    error?: string;
    message?: string;
    next?: string;
    reset?: string;
  }>;
}

export default async function SignInPage({
  searchParams
}: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authReturnSearchParams = resolvedSearchParams as
    | Record<string, string | string[] | undefined>
    | undefined;

  if (hasSupabaseAuthReturnParams(authReturnSearchParams)) {
    redirect(
      buildSupabaseAuthCallbackPath(authReturnSearchParams ?? {}) as Parameters<
        typeof redirect
      >[0]
    );
  }

  const session = await auth();
  const safeNextPath = normalizeRedirectPath(resolvedSearchParams?.next);

  if (session?.user) {
    redirect((safeNextPath ?? "/dashboard") as Parameters<typeof redirect>[0]);
  }

  return (
    <SignInForm
      oauthError={resolvedSearchParams?.error ?? null}
      message={resolvedSearchParams?.message ?? null}
      nextPath={safeNextPath}
      providerAvailability={getPublicAuthProviderAvailability()}
      resetStatus={resolvedSearchParams?.reset ?? null}
    />
  );
}
