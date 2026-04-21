import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { signOut } from "@/auth";
import { normalizeRedirectPath } from "@/lib/auth/session";

function resolveAppOrigin(request: NextRequest): string {
  const configuredOrigin =
    process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // Fall back to request origin.
    }
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest): Promise<Response> {
  const requestUrl = new URL(request.url);
  const appOrigin = resolveAppOrigin(request);
  const nextParam = normalizeRedirectPath(requestUrl.searchParams.get("next"));
  const destination = nextParam ?? "/sign-in";

  await signOut();

  return NextResponse.redirect(new URL(destination, appOrigin));
}
