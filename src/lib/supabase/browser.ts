"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function getSupabaseBrowserClient(): SupabaseClient {
  return createClient();
}
