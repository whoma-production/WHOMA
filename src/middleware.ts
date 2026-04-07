import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

import {
  canAccessPagePath,
  defaultRouteForRole,
  getPageRoutePolicy,
  normalizeRedirectPath
} from "@/lib/auth/session";

function getAuthSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? (process.env.NODE_ENV !== "production" ? "dev-only-nextauth-secret-change-me" : undefined);
}

function getAuthSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

function getCanonicalDevOrigin(): URL | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const candidate = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

  if (!candidate) {
    return null;
  }

  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

type AccountAccessState = "APPROVED" | "PENDING" | "DENIED";

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

  const authSecret = getAuthSecret();
  const cookieName = getAuthSessionCookieName();
  const token = await getToken(
    authSecret
      ? { req: request, secret: authSecret, cookieName }
      : { req: request, cookieName }
  );
  const role = (token?.role as UserRole | null | undefined) ?? null;
  const accessState =
    (token?.accessState as AccountAccessState | null | undefined) ??
    "APPROVED";

  if (!token) {
    const signInUrl = new URL("/sign-in", request.url);
    const nextPath = normalizeRedirectPath(`${pathname}${search}`);

    if (nextPath) {
      signInUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(signInUrl);
  }

  if (!role) {
    if (pathname === "/onboarding/role") {
      return NextResponse.next();
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

  return NextResponse.next();
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
