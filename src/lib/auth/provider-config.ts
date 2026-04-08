import { getSupabasePublicConfig } from "@/lib/supabase/config";

function isExplicitlyDisabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "false";
}

export interface PublicAuthProviderAvailability {
  google: boolean;
  email: boolean;
  any: boolean;
}

export type PublicEmailAuthMethod = "magic-link" | "none";

function isSupabaseAuthConfigured(): boolean {
  return Boolean(getSupabasePublicConfig());
}

function isGoogleSignInEnabled(): boolean {
  if (!isSupabaseAuthConfigured()) {
    return false;
  }

  return !isExplicitlyDisabled(process.env.SUPABASE_GOOGLE_AUTH_ENABLED);
}

export function isEmailMagicLinkAuthEnabled(): boolean {
  if (!isSupabaseAuthConfigured()) {
    return false;
  }

  return !isExplicitlyDisabled(process.env.SUPABASE_EMAIL_AUTH_ENABLED);
}

export function getPublicEmailAuthMethod(): PublicEmailAuthMethod {
  if (isEmailMagicLinkAuthEnabled()) {
    return "magic-link";
  }

  return "none";
}

export function getPublicAuthProviderAvailability(): PublicAuthProviderAvailability {
  const google = isGoogleSignInEnabled();
  const email = isEmailMagicLinkAuthEnabled();

  return {
    google,
    email,
    any: google || email
  };
}
