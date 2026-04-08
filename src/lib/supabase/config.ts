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

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = readFirstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_URL
  );
  const anonKey = readFirstNonEmpty(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_ANON_KEY
  );

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(
      "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return config;
}
