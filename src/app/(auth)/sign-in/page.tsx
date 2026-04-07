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
  PUBLIC_AGENT_CTA_HREF
} from "@/lib/public-site";
import { getPublicAuthProviderAvailability } from "@/lib/auth/provider-config";

interface PageProps {
  searchParams?: Promise<{ next?: string; error?: string }>;
}

export default async function SignInPage({
  searchParams
}: PageProps): Promise<JSX.Element> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextParam = normalizeRedirectPath(resolvedSearchParams?.next) ?? null;
  const providerAvailability = getPublicAuthProviderAvailability();
  const site = getPublicSiteConfig();
  const title = providerAvailability.any
    ? "Sign in to WHOMA"
    : "Account access for WHOMA";
  const description = providerAvailability.any
    ? "Continue with your profile, instructions, offers, and messages."
    : "Self-serve sign-in is not configured right now. Contact support and we will help you get into the right account.";

  return (
    <main className="grid min-h-screen place-items-center bg-surface-1 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo subtitle={site.logoSubtitle} compact={false} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleAuthButton
              providerAvailability={providerAvailability}
              authMode="sign-in"
              uxMode="public"
              supportEmail={site.supportEmail}
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
            Create your account
          </Link>
        </p>
      </div>
    </main>
  );
}
