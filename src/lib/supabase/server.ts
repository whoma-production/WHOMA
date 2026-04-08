import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabasePublicConfig } from "@/lib/supabase/config";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const config = requireSupabasePublicConfig();

  return createServerClient(config.url, config.anonKey, {
    auth: {
      flowType: "pkce"
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>
      ) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // In read-only contexts (e.g. RSC), Next.js blocks cookie writes.
        }
      }
    }
  });
}
