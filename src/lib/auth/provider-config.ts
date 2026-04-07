function readFirstNonEmpty(
  ...values: Array<string | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

export interface PublicAuthProviderAvailability {
  google: boolean;
  apple: boolean;
  email: boolean;
  any: boolean;
}

export function getGoogleAuthProviderConfig():
  | {
      clientId: string;
      clientSecret: string;
    }
  | null {
  const clientId = readFirstNonEmpty(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = readFirstNonEmpty(process.env.GOOGLE_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret
  };
}

export function getAppleAuthProviderConfig():
  | {
      clientId: string;
      clientSecret: string;
    }
  | null {
  const clientId = readFirstNonEmpty(
    process.env.AUTH_APPLE_ID,
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_ID
  );
  const clientSecret = readFirstNonEmpty(
    process.env.AUTH_APPLE_SECRET,
    process.env.APPLE_CLIENT_SECRET
  );
  const authUrl = readFirstNonEmpty(
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );

  if (!clientId || !clientSecret || !authUrl?.startsWith("https://")) {
    return null;
  }

  return {
    clientId,
    clientSecret
  };
}

export function isEmailPasswordAuthEnabled(): boolean {
  return Boolean(readFirstNonEmpty(process.env.DATABASE_URL));
}

export function getPublicAuthProviderAvailability(): PublicAuthProviderAvailability {
  const google = Boolean(getGoogleAuthProviderConfig());
  const apple = Boolean(getAppleAuthProviderConfig());
  const email = isEmailPasswordAuthEnabled();

  return {
    google,
    apple,
    email,
    any: google || apple || email
  };
}
