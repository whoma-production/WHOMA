import Link from "next/link";
import { Suspense } from "react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF,
  PUBLIC_AGENT_DIRECTORY_HREF
} from "@/lib/public-site";

export default function SignInPage(): JSX.Element {
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
              Access your verification, onboarding, profile publishing, and trust-review workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Suspense fallback={<p className="text-sm text-text-muted">Loading sign-in options...</p>}>
              <GoogleAuthButton
                providerConfigured={providerConfigured}
                uxMode="public"
                betaSupportEmail={site.supportEmail}
                betaCtaHref={PUBLIC_AGENT_DIRECTORY_HREF}
                betaCtaLabel="Browse verified agents"
                betaMessage="Google sign-in is being rolled out carefully. While public access stays controlled, WHOMA is coordinating pilot entry directly with agents and invited homeowners."
              />
            </Suspense>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-muted">
          Need access to the verified-profile pilot?{" "}
          <Link href={PUBLIC_AGENT_CTA_HREF} className="font-medium text-brand-ink underline">
            Start the agent path
          </Link>
        </p>
      </div>
    </main>
  );
}
