import { redirect } from "next/navigation";

interface SignupAliasPageProps {
  searchParams?: Promise<{ role?: string }>;
}

function normalizeRole(value: string | undefined): "SELLER" | "HOMEOWNER" | "AGENT" | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "SELLER") {
    return "SELLER";
  }

  if (normalized === "HOMEOWNER") {
    return "HOMEOWNER";
  }

  if (normalized === "AGENT") {
    return "AGENT";
  }

  return null;
}

export default async function SignupAliasPage({
  searchParams
}: SignupAliasPageProps): Promise<never> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedRole = normalizeRole(resolvedSearchParams?.role);

  if (requestedRole === "SELLER" || requestedRole === "HOMEOWNER") {
    redirect("/auth/login?message=coming-soon");
  }

  if (requestedRole === "AGENT") {
    redirect("/sign-up?role=AGENT");
  }

  redirect("/sign-up");
}
