import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

function getCanonicalAppOrigin(): URL | null {
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
  const isRoleSwitchRequest =
    pathname === "/onboarding/role" &&
    request.nextUrl.searchParams.get("switch") === "1";

  if (pathname === "/api/health") {
    return NextResponse.next({ request });
  }

  const canonicalAppOrigin = getCanonicalAppOrigin();
  const requestHost = request.headers.get("host") ?? request.nextUrl.host;

  if (
    canonicalAppOrigin &&
    (requestHost !== canonicalAppOrigin.host ||
      request.nextUrl.protocol !== canonicalAppOrigin.protocol)
  ) {
    const canonicalUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      canonicalAppOrigin
    );

    return NextResponse.redirect(canonicalUrl, 307);
  }

  let supabaseResponse = NextResponse.next({ request });
  let authenticatedUserId: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        }
      }
    });

    // Refresh session — do not remove this.
    const {
      data: { user }
    } = await supabase.auth.getUser();

    authenticatedUserId = user?.id ?? null;
  }

  const policy = getPageRoutePolicy(pathname);

  if (!policy) {
    return supabaseResponse;
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
  const accessHintMatchesUser = Boolean(
    accessHint?.supabaseUserId &&
      accessHint.supabaseUserId === authenticatedUserId
  );

  if (!accessHint || !accessHintMatchesUser) {
    // Allow the request through so server-rendered pages can rebuild the
    // access hint from the live Supabase session instead of trapping the user
    // on the public sign-in route.
    return supabaseResponse;
  }

  const role = accessHint.role;
  const accessState: AccountAccessState = accessHint.accessState;

  if (!role) {
    if (pathname === "/onboarding/role") {
      return supabaseResponse;
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

  if (pathname === "/onboarding/role" && !isRoleSwitchRequest) {
    return NextResponse.redirect(new URL(defaultRouteForRole(role), request.url));
  }

  if (!canAccessPagePath(role, pathname)) {
    const fallbackUrl = new URL(defaultRouteForRole(role), request.url);
    fallbackUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(fallbackUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
