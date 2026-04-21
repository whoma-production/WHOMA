"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabasePublicConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const config = requireSupabasePublicConfig();

  browserClient = createBrowserClient(config.url, config.anonKey, {
    auth: {
      flowType: "pkce"
    }
  });

  return browserClient;
}
