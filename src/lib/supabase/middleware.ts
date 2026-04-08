import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { requireSupabasePublicConfig } from "@/lib/supabase/config";

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  const config = requireSupabasePublicConfig();

  return createServerClient(config.url, config.anonKey, {
    auth: {
      flowType: "pkce"
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>
      ) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      }
    }
  });
}
