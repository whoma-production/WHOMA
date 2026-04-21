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

function toOrigin(candidate: string): string | null {
  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function isLocalHostOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveConfiguredOrigin(): string | null {
  const configured = readFirstNonEmpty(
    process.env.NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL
  );

  if (!configured) {
    return null;
  }

  return toOrigin(configured);
}

interface ResolveAuthOriginOptions {
  fallbackOrigin?: string | null;
}

export function resolveAuthOrigin(
  options?: ResolveAuthOriginOptions
): string | null {
  const configuredOrigin = resolveConfiguredOrigin();
  const fallbackOrigin = options?.fallbackOrigin
    ? toOrigin(options.fallbackOrigin)
    : null;

  // In production, keep auth on the same public host the user is actually using.
  if (
    process.env.NODE_ENV === "production" &&
    fallbackOrigin &&
    !isLocalHostOrigin(fallbackOrigin)
  ) {
    if (!configuredOrigin) {
      return fallbackOrigin;
    }

    if (configuredOrigin !== fallbackOrigin) {
      return fallbackOrigin;
    }
  }

  return configuredOrigin ?? fallbackOrigin;
}

export function buildAuthCallbackUrl(
  nextPath: string,
  options?: ResolveAuthOriginOptions
): string {
  const origin = resolveAuthOrigin(options);

  if (!origin) {
    throw new Error(
      "Cannot resolve auth callback origin. Set NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN or NEXT_PUBLIC_APP_URL."
    );
  }

  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);

  return callbackUrl.toString();
}
