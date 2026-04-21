import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildAuthCallbackUrl } from "@/lib/auth/callback-origin";
import { getPublicAuthProviderAvailability } from "@/lib/auth/provider-config";
import { normalizeRedirectPath } from "@/lib/auth/session";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function buildSupabaseGoogleAuthorizeUrl(
  supabaseUrl: string,
  callbackUrl: string
): string {
  const url = new URL("/auth/v1/authorize", supabaseUrl);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", callbackUrl);
  return url.toString();
}

export async function GET(request: NextRequest): Promise<Response> {
  const providerAvailability = getPublicAuthProviderAvailability();

  if (!providerAvailability.google) {
    return NextResponse.json(
      {
        ok: false,
        error: "Google sign-in is not enabled for this environment."
      },
      { status: 503 }
    );
  }

  const config = getSupabasePublicConfig();

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error: "Google sign-in is not configured correctly."
      },
      { status: 503 }
    );
  }

  const nextPath =
    normalizeRedirectPath(request.nextUrl.searchParams.get("next")) ??
    "/dashboard";

  let callbackUrl: string;

  try {
    callbackUrl = buildAuthCallbackUrl(nextPath, {
      fallbackOrigin: request.nextUrl.origin
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Google sign-in is not configured correctly."
      },
      { status: 503 }
    );
  }

  const authorizeUrl = buildSupabaseGoogleAuthorizeUrl(config.url, callbackUrl);

  try {
    const response = await fetch(authorizeUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store"
    });

    if (response.status >= 400) {
      return NextResponse.json(
        {
          ok: false,
          error: "Google sign-in is not enabled for this environment."
        },
        { status: 503 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Google sign-in is not enabled for this environment."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
