import { NextResponse } from "next/server";

import { normalizeRedirectPath } from "@/lib/auth/session";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next =
    normalizeRedirectPath(searchParams.get("next")) ?? "/dashboard";

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // Fall through to the auth error route below.
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
