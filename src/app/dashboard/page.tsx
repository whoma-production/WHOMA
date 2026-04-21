import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { defaultRouteForRole } from "@/lib/auth/session";

export default async function DashboardPage(): Promise<never> {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?next=/dashboard");
  }

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
