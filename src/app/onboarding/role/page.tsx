import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signOut, unstable_update } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { defaultRouteForRole, getAuthErrorMessage } from "@/lib/auth/session";

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

  await unstable_update({ user: { role: updatedUser.role } });

  redirect(defaultRouteForRole(updatedUser.role));
}

export default async function RoleOnboardingPage({ searchParams }: RoleOnboardingPageProps): Promise<JSX.Element> {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?next=/onboarding/role");
  }

  if (session.user.role) {
    redirect(defaultRouteForRole(session.user.role));
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
          <Logo subtitle="Where Home Owners Meet Real Estate Agents" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose your role</CardTitle>
            <CardDescription>
              You only do this once. Your role controls which routes you can access and what actions you can take.
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
                    <h2 className="text-lg">Homeowner</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      Create instructions, compare structured proposals, shortlist agents and award the instruction.
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
                    <h2 className="text-lg">Real Estate Agent</h2>
                    <p className="mt-2 text-sm text-text-muted">
                      Build your professional profile, appear in the public directory, and submit structured proposals to LIVE instructions.
                    </p>
                  </div>
                  <Button type="submit" variant="secondary" fullWidth>
                    Continue as Real Estate Agent
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
                Sign out and use a different Google account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
