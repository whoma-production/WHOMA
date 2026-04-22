import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PublicHeader } from "@/components/layout/public-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildSupabaseAuthCallbackPath,
  hasSupabaseAuthReturnParams
} from "@/lib/auth/callback-return";

interface ResetPasswordPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({
  searchParams
}: ResetPasswordPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (hasSupabaseAuthReturnParams(resolvedSearchParams)) {
    redirect(
      buildSupabaseAuthCallbackPath(resolvedSearchParams ?? {}, {
        fallbackNextPath: "/auth/reset-password"
      }) as Parameters<typeof redirect>[0]
    );
  }

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />
      <main className="grid px-4 py-10">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Choose a new password for your WHOMA account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
