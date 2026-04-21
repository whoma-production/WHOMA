import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { signOut } from "@/auth";
import { resolveAuthOrigin } from "@/lib/auth/callback-origin";
import { normalizeRedirectPath } from "@/lib/auth/session";

export async function GET(request: NextRequest): Promise<Response> {
  const requestUrl = new URL(request.url);
  const appOrigin =
    resolveAuthOrigin({
      fallbackOrigin: request.nextUrl.origin
    }) ?? request.nextUrl.origin;
  const nextParam = normalizeRedirectPath(requestUrl.searchParams.get("next"));
  const destination = nextParam ?? "/";

  await signOut();

  return NextResponse.redirect(new URL(destination, appOrigin));
}
