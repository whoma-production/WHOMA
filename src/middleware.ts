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

export async function middleware(request: NextRequest): Promise<Response> {
  const { pathname, search } = request.nextUrl;
  const policy = getPageRoutePolicy(pathname);

  if (!policy) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: getAuthSecret() });
  const role = (token?.role as UserRole | null | undefined) ?? null;

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
  matcher: ["/homeowner/:path*", "/agent/:path*", "/admin/:path*", "/messages/:path*", "/onboarding/role"]
};
