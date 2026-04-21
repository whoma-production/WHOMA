import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signOut, unstable_update } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { defaultRouteForRole, getAuthErrorMessage } from "@/lib/auth/session";
import { getPublicSiteConfig } from "@/lib/public-site";

const onboardingRoleSchema = z.object({
  role: z.enum(["HOMEOWNER", "AGENT"])
});

interface RoleOnboardingPageProps {
  searchParams?: Promise<{ error?: string }>;
}

async function setRoleAction(formData: FormData): Promise<void> {
  "use server";

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?error=AccessDenied&next=/onboarding/role");
  }

  const parsed = onboardingRoleSchema.safeParse({
    role: formData.get("role")
  });

  if (!parsed.success) {
    redirect("/onboarding/role?error=invalid_role");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true }
  });

  if (!currentUser) {
    redirect("/sign-in?error=AccessDenied&next=/onboarding/role");
  }

  if (currentUser.role) {
    redirect(defaultRouteForRole(currentUser.role));
  }

  const updatedUser = await prisma.user.update({
    where: { id: currentUser.id },
    data: { role: parsed.data.role },
    select: { role: true }
  });

  if (!updatedUser.role) {
    redirect("/onboarding/role?error=invalid_role");
  }

  await unstable_update({ user: { role: updatedUser.role } });

  redirect(defaultRouteForRole(updatedUser.role));
}

export default async function RoleOnboardingPage({ searchParams }: RoleOnboardingPageProps): Promise<JSX.Element> {
  const session = await auth();
  const site = getPublicSiteConfig();

  if (!session?.user) {
    redirect("/sign-in?next=/onboarding/role");
  }

  const sessionRole = session.user.role;
  if (sessionRole) {
    redirect(defaultRouteForRole(sessionRole));
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorCode = resolvedSearchParams?.error;
  const errorMessage =
    errorCode === "invalid_role"
      ? "Choose either Homeowner or Agent to continue."
      : getAuthErrorMessage(errorCode);

  return (
    <main className="grid min-h-screen place-items-center bg-surface-1 px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-center">
          <Logo subtitle={site.logoSubtitle} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What brings you to Whoma?</CardTitle>
            <CardDescription>
              You only do this once. We use it to route you into the right part
              of WHOMA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage ? (
              <p className="rounded-md border border-state-danger/20 bg-state-danger/10 px-3 py-2 text-sm text-state-danger">
                {errorMessage}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <form action={setRoleAction} className="contents">
                <input type="hidden" name="role" value="HOMEOWNER" />
                <Card className="interactive-lift flex h-full flex-col justify-between gap-4 p-5">
                  <div>
                    <h2 className="text-lg">I&apos;m selling my home</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      Request selective seller access while WHOMA continues to
                      expand collaboration coverage.
                    </p>
                  </div>
                  <Button type="submit" fullWidth>
                    Continue as Homeowner
                  </Button>
                </Card>
              </form>

              <form action={setRoleAction} className="contents">
                <input type="hidden" name="role" value="AGENT" />
                <Card className="interactive-lift flex h-full flex-col justify-between gap-4 p-5">
                  <div>
                    <h2 className="text-lg">I&apos;m an estate agent</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      Verify your email, complete your structured profile,
                      and build a stronger public presence.
                    </p>
                  </div>
                  <Button type="submit" variant="primary" fullWidth>
                    Continue as Agent
                  </Button>
                </Card>
              </form>
            </div>

            <form
              action={async (): Promise<void> => {
                "use server";
                await signOut({ redirectTo: "/sign-in" });
              }}
              className="pt-2"
            >
              <Button type="submit" variant="tertiary" fullWidth>
                Sign out and use a different account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
