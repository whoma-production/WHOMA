import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage(): JSX.Element {
  const providerConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="grid min-h-screen place-items-center bg-surface-1 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo subtitle="Where Home Owners Meet Real Estate Agents" compact={false} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Continue with Google to access your WHOMA account. New users choose Homeowner or Real Estate Agent after sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthButton providerConfigured={providerConfigured} />
            <p className="text-xs text-text-muted">
              We use Google sign-in for a faster, cleaner MVP auth flow. Your role (Homeowner or Real Estate Agent) is selected once during onboarding.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-muted">
          New to WHOMA? <Link href="/sign-up" className="font-medium text-brand-ink underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
