import { redirect } from "next/navigation";

interface AuthLoginAliasPageProps {
  searchParams?: Promise<{
    message?: string;
  }>;
}

export default async function AuthLoginAliasPage({
  searchParams
}: AuthLoginAliasPageProps): Promise<never> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const message = resolvedSearchParams?.message?.trim();

  if (message) {
    redirect(`/sign-in?message=${encodeURIComponent(message)}`);
  }

  redirect("/sign-in");
}
