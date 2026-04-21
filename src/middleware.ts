import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_HINT_COOKIE_NAME,
  decodeAccessHint,
  type AccountAccessState
} from "@/lib/auth/access-hint";
import {
  canAccessPagePath,
  defaultRouteForRole,
  getPageRoutePolicy,
  normalizeRedirectPath
} from "@/lib/auth/session";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

function getCanonicalDevOrigin(): URL | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const candidate =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL;

  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest): Promise<Response> {
  const { pathname, search } = request.nextUrl;
  const canonicalDevOrigin = getCanonicalDevOrigin();
  const requestHost = request.headers.get("host") ?? request.nextUrl.host;

  if (
    canonicalDevOrigin &&
    (requestHost !== canonicalDevOrigin.host ||
      request.nextUrl.protocol !== canonicalDevOrigin.protocol)
  ) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = canonicalDevOrigin.protocol;
    canonicalUrl.host = canonicalDevOrigin.host;

    return NextResponse.redirect(canonicalUrl, 307);
  }

  const policy = getPageRoutePolicy(pathname);

  if (!policy) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  let authenticatedUserId: string | null = null;

  try {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    authenticatedUserId = user?.id ?? null;
  } catch {
    authenticatedUserId = null;
  }

  if (!authenticatedUserId) {
    const signInUrl = new URL("/sign-in", request.url);
    const nextPath = normalizeRedirectPath(`${pathname}${search}`);

    if (nextPath) {
      signInUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(signInUrl);
  }

  const accessHint = decodeAccessHint(
    request.cookies.get(ACCESS_HINT_COOKIE_NAME)?.value
  );

  if (!accessHint || accessHint.userId !== authenticatedUserId) {
    return response;
  }

  const role = accessHint.role;
  const accessState: AccountAccessState = accessHint.accessState;

  if (!role) {
    if (pathname === "/onboarding/role") {
      return response;
    }

    return NextResponse.redirect(new URL("/onboarding/role", request.url));
  }

  if (role === "AGENT" && pathname.startsWith("/agent")) {
    if (accessState === "DENIED") {
      return NextResponse.redirect(new URL("/access/denied", request.url));
    }

    if (accessState === "PENDING") {
      return NextResponse.redirect(new URL("/access/pending", request.url));
    }
  }

  if (
    role === "AGENT" &&
    accessState === "APPROVED" &&
    (pathname === "/access/pending" || pathname === "/access/denied")
  ) {
    return NextResponse.redirect(new URL("/agent/onboarding", request.url));
  }

  if (pathname === "/onboarding/role") {
    return NextResponse.redirect(new URL(defaultRouteForRole(role), request.url));
  }

  if (!canAccessPagePath(role, pathname)) {
    const fallbackUrl = new URL(defaultRouteForRole(role), request.url);
    fallbackUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(fallbackUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/sign-in",
    "/sign-up",
    "/access/:path*",
    "/onboarding/role",
    "/homeowner/:path*",
    "/agent/:path*",
    "/admin/:path*",
    "/messages/:path*"
  ]
};
