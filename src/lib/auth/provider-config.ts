import { getSupabasePublicConfig } from "@/lib/supabase/config";

function isExplicitlyDisabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "false";
}

function isExplicitlyEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export interface PublicAuthProviderAvailability {
  google: boolean;
  email: boolean;
  any: boolean;
}

export type PublicEmailAuthMethod = "password" | "none";

function isSupabaseAuthConfigured(): boolean {
  return Boolean(getSupabasePublicConfig());
}

function isGoogleSignInEnabled(): boolean {
  if (!isSupabaseAuthConfigured()) {
    return false;
  }

  return isExplicitlyEnabled(process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED);
}

function isEmailPasswordAuthEnabled(): boolean {
  if (!isSupabaseAuthConfigured()) {
    return false;
  }

  return !isExplicitlyDisabled(process.env.SUPABASE_EMAIL_AUTH_ENABLED);
}

export function getPublicEmailAuthMethod(): PublicEmailAuthMethod {
  return isEmailPasswordAuthEnabled() ? "password" : "none";
}

export function getPublicAuthProviderAvailability(): PublicAuthProviderAvailability {
  const google = isGoogleSignInEnabled();
  const email = isEmailPasswordAuthEnabled();

  return {
    google,
    email,
    any: google || email
  };
}
