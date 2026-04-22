import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { resolveAuthOrigin } from "@/lib/auth/callback-origin";
import { normalizeRedirectPath } from "@/lib/auth/session";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

function toEmailOtpType(value: string | null): EmailOtpType | null {
  switch (value) {
    case "email":
    case "signup":
    case "invite":
    case "magiclink":
    case "recovery":
    case "email_change":
      return value;
    default:
      return null;
  }
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin =
    resolveAuthOrigin({ fallbackOrigin: requestUrl.origin }) ??
    requestUrl.origin;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = toEmailOtpType(searchParams.get("type"));
  const next =
    normalizeRedirectPath(searchParams.get("next")) ?? "/dashboard";

  try {
    const supabase = await createSupabaseServerClient();

    if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType
      });

      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  } catch {
    // Fall through to the auth error route below.
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
