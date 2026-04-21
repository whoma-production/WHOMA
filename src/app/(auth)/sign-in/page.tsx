import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildSupabaseAuthCallbackPath,
  hasSupabaseAuthReturnParams
} from "@/lib/auth/callback-return";
import {
  defaultRouteForRole,
  normalizeRedirectPath
} from "@/lib/auth/session";
import {
  getPublicSiteConfig,
  PUBLIC_AGENT_CTA_HREF
} from "@/lib/public-site";
import {
  getPublicAuthProviderAvailability,
  getPublicEmailAuthMethod
} from "@/lib/auth/provider-config";
import { createSupportInquiry } from "@/server/support/inquiries";

interface PageProps {
  searchParams?: Promise<{
    next?: string;
    error?: string;
    waitlist?: string;
  }>;
}

const waitlistInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.string().trim().max(80).optional()
});

async function joinWaitlistAction(formData: FormData): Promise<void> {
  "use server";

  const parsed = waitlistInputSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect("/sign-in?waitlist=invalid");
  }

  try {
    await createSupportInquiry({
      name: parsed.data.fullName,
      email: parsed.data.email,
      role: parsed.data.role,
      category: "BETA_WAITLIST",
      message:
        "Joined beta waitlist from public sign-in while self-serve auth was unavailable.",
      pagePath: "/sign-in",
      source: "/sign-in"
    });
  } catch {
    redirect("/sign-in?waitlist=error");
  }

  redirect("/sign-in?waitlist=joined");
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
    if (!session.user.role) {
      redirect("/onboarding/role");
    }

    if (session.user.role === "AGENT") {
      if (session.user.accessState === "DENIED") {
        redirect("/access/denied");
      }

      if (session.user.accessState === "PENDING") {
        redirect("/access/pending");
      }
    }

    redirect(defaultRouteForRole(session.user.role));
  }

  const nextParam = normalizeRedirectPath(resolvedSearchParams?.next) ?? null;
  const providerAvailability = getPublicAuthProviderAvailability();
  const emailAuthMethod = getPublicEmailAuthMethod();
  const site = getPublicSiteConfig();
  const signInMethodsDescription =
    providerAvailability.google && emailAuthMethod === "otp"
      ? "Continue with Google or email. No password needed. Email sign-in finishes with a one-time code."
      : providerAvailability.google && emailAuthMethod === "magic-link"
        ? "Continue with Google or email. No password needed. Email sign-in sends a secure link."
        : emailAuthMethod === "otp"
          ? "Continue with email. No password needed. We will send a one-time code to finish sign-in."
          : emailAuthMethod === "magic-link"
            ? "Continue with email. No password needed. We will send a secure sign-in link."
            : providerAvailability.google
              ? "Continue with Google. Access review happens after sign-in."
              : "Sign-in is temporarily unavailable. Contact support for help.";

  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />
      <main className="grid px-4 py-10">
        <div className="mx-auto w-full max-w-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sign in to WHOMA</CardTitle>
              <CardDescription>
                {signInMethodsDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <GoogleAuthButton
                providerAvailability={providerAvailability}
                emailAuthMethod={emailAuthMethod}
                authMode="sign-in"
                uxMode="public"
                supportEmail={site.supportEmail}
                nextParam={nextParam}
                oauthError={resolvedSearchParams?.error ?? null}
              />
            </CardContent>
          </Card>

          <Card className="space-y-3">
            <CardHeader>
              <CardTitle className="text-lg">Access help</CardTitle>
              <CardDescription>
                If your account needs approval support, request help here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resolvedSearchParams?.waitlist === "invalid" ? (
                <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
                  Enter your full name and a valid email.
                </p>
              ) : null}
              {resolvedSearchParams?.waitlist === "error" ? (
                <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
                  We could not submit your request right now. Please try again.
                </p>
              ) : null}
              {resolvedSearchParams?.waitlist === "joined" ? (
                <p className="rounded-md border border-state-success/20 bg-state-success/10 px-3 py-2 text-sm text-state-success">
                  Request received. We&apos;ll follow up through support.
                </p>
              ) : null}

              <form action={joinWaitlistAction} className="space-y-3">
                <label className="space-y-1">
                  <span className="text-sm text-text-muted">Full name</span>
                  <Input name="fullName" required placeholder="Your full name" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-text-muted">Email</span>
                  <Input name="email" type="email" required placeholder="you@example.com" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-text-muted">Role (optional)</span>
                  <Input
                    name="role"
                    placeholder="Independent estate agent, investor, partner..."
                  />
                </label>
                <Button type="submit" fullWidth variant="secondary">
                  Request access help
                </Button>
              </form>
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
    </div>
  );
}
