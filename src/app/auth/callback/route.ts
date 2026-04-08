import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { normalizeRedirectPath } from "@/lib/auth/session";
import { defaultRouteForRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function mapCallbackErrorCode(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("expired") ||
    normalized.includes("invalid") ||
    normalized.includes("otp")
  ) {
    return "Verification";
  }

  if (
    normalized.includes("provider") ||
    normalized.includes("oauth") ||
    normalized.includes("not enabled")
  ) {
    return "Configuration";
  }

  return "Callback";
}

function buildSignInRedirect(
  request: NextRequest,
  options: { code: string; next: string | null }
): URL {
  const destination = new URL("/sign-in", request.url);
  destination.searchParams.set("error", options.code);

  if (options.next) {
    destination.searchParams.set("next", options.next);
  }

  return destination;
}

function isOtpType(value: string): value is EmailOtpType {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const requestUrl = new URL(request.url);
  const nextParam = normalizeRedirectPath(requestUrl.searchParams.get("next"));

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;

  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return NextResponse.redirect(
      buildSignInRedirect(request, { code: "Configuration", next: nextParam })
    );
  }

  const providerError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      buildSignInRedirect(request, {
        code: mapCallbackErrorCode(providerError),
        next: nextParam
      })
    );
  }

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        buildSignInRedirect(request, {
          code: mapCallbackErrorCode(error.message),
          next: nextParam
        })
      );
    }
  } else if (tokenHash && otpType && isOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash
    });

    if (error) {
      return NextResponse.redirect(
        buildSignInRedirect(request, {
          code: mapCallbackErrorCode(error.message),
          next: nextParam
        })
      );
    }
  } else {
    return NextResponse.redirect(
      buildSignInRedirect(request, { code: "Callback", next: nextParam })
    );
  }

  const session = await auth();

  if (!session?.user.id) {
    return NextResponse.redirect(
      buildSignInRedirect(request, { code: "AccessDenied", next: nextParam })
    );
  }

  if (!session.user.role) {
    return NextResponse.redirect(new URL("/onboarding/role", request.url));
  }

  if (session.user.role === "AGENT") {
    if (session.user.accessState === "DENIED") {
      return NextResponse.redirect(new URL("/access/denied", request.url));
    }

    if (session.user.accessState === "PENDING") {
      return NextResponse.redirect(new URL("/access/pending", request.url));
    }
  }

  const destination = nextParam ?? defaultRouteForRole(session.user.role);

  return NextResponse.redirect(new URL(destination, request.url));
}
