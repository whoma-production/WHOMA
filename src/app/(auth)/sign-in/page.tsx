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
  const title = providerConfigured
    ? "Sign in to WHOMA"
    : "Request access to WHOMA";
  const description = providerConfigured
    ? "Continue into onboarding, profile publishing, or the collaboration pilot with a complete Google sign-in flow and a direct email fallback when access is still being staged."
    : "Pilot access is currently coordinated manually. Use the monitored support route to request access, confirm rollout status, or get help with an existing pilot account.";

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
              providerConfigured={providerConfigured}
              uxMode="public"
              betaSupportEmail={site.supportEmail}
              betaCtaHref={PUBLIC_AGENT_DIRECTORY_HREF}
              betaCtaLabel="Browse verified agents"
              betaMessage="Pilot accounts are currently opened through the monitored support inbox. Include whether you are an estate agent, homeowner, or partner so the request can be routed quickly."
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
