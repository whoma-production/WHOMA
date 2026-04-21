import { getSupabasePublicConfig } from "@/lib/supabase/config";

function isExplicitlyDisabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "false";
}

export interface PublicAuthProviderAvailability {
  google: boolean;
  email: boolean;
  any: boolean;
}

export type PublicEmailAuthMethod = "magic-link" | "otp" | "none";

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

function resolveEmailAuthMethod(): Extract<PublicEmailAuthMethod, "magic-link" | "otp"> {
  const normalized = process.env.SUPABASE_EMAIL_AUTH_METHOD?.trim().toLowerCase();

  if (normalized === "magic-link") {
    return "magic-link";
  }

  if (normalized === "otp") {
    return "otp";
  }

  if (process.env.NODE_ENV !== "production" && !normalized) {
    return "magic-link";
  }

  throw new Error(
    "SUPABASE_EMAIL_AUTH_METHOD must be explicitly set to 'magic-link' or 'otp' when email auth is enabled."
  );
}

function getResolvedEmailAuthMethod(): Extract<
  PublicEmailAuthMethod,
  "magic-link" | "otp" | "none"
> {
  try {
    return resolveEmailAuthMethod();
  } catch {
    return "none";
  }
}

export function getPublicEmailAuthMethod(): PublicEmailAuthMethod {
  if (isEmailMagicLinkAuthEnabled()) {
    return getResolvedEmailAuthMethod();
  }

  return "none";
}

export function getPublicAuthProviderAvailability(): PublicAuthProviderAvailability {
  const google = isGoogleSignInEnabled();
  const email = isEmailMagicLinkAuthEnabled() && getResolvedEmailAuthMethod() !== "none";

  return {
    google,
    email,
    any: google || email
  };
}
