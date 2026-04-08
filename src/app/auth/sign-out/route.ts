import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { signOut } from "@/auth";
import { normalizeRedirectPath } from "@/lib/auth/session";

export async function GET(request: NextRequest): Promise<Response> {
  const requestUrl = new URL(request.url);
  const nextParam = normalizeRedirectPath(requestUrl.searchParams.get("next"));
  const destination = nextParam ?? "/sign-in";

  await signOut();

  return NextResponse.redirect(new URL(destination, request.url));
}
