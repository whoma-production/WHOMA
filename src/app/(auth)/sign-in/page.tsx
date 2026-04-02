import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Logo } from "@/components/brand/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { normalizeRedirectPath } from "@/lib/auth/session";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF
} from "@/lib/public-site";

interface PageProps {
  searchParams?: Promise<{ next?: string; error?: string }>;
}

export default async function SignInPage({
  searchParams
}: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParam = normalizeRedirectPath(resolvedSearchParams?.next) ?? null;
  const providerConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const site = getPublicSiteConfig();

  return (
    <main className="grid min-h-screen place-items-center bg-surface-1 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo subtitle={site.logoSubtitle} compact={false} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to WHOMA</CardTitle>
            <CardDescription>
              Continue into onboarding, profile publishing, or the collaboration
              pilot with a complete Google sign-in flow and a direct email
              fallback when access is still being staged.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthButton
              providerConfigured={providerConfigured}
              uxMode="public"
              betaSupportEmail={site.supportEmail}
              betaCtaHref={PUBLIC_AGENT_DIRECTORY_HREF}
              betaCtaLabel="Browse verified agents"
              betaMessage="Google sign-in is available in stages. If your account is not live yet, WHOMA routes pilot access through the monitored support inbox."
              nextParam={nextParam}
              oauthError={resolvedSearchParams?.error ?? null}
            />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-muted">
          Need a fresh account?{" "}
          <Link
            href={PUBLIC_AGENT_CTA_HREF}
            className="font-medium text-brand-ink underline"
          >
            Build your verified profile
          </Link>
        </p>
      </div>
    </main>
  );
}
