import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type MaybePromise<T> = T | Promise<T>;

type PastDealVerifyRow = {
  verification_status: "unverified" | "pending" | "verified" | "disputed";
};

const tokenSchema = z.string().uuid("Invalid verification token.");

function jsonError(status: number, code: string, message: string): Response {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message }
    },
    { status }
  );
}

export async function GET(
  request: Request,
  context: { params: MaybePromise<{ token: string }> }
): Promise<Response> {
  const { token } = await context.params;
  const parsedToken = tokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return jsonError(400, "INVALID_TOKEN", "Invalid verification token.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: dealData, error: dealError } = await supabase
    .from("past_deals")
    .select("verification_status")
    .eq("verification_token", parsedToken.data)
    .maybeSingle();

  if (dealError) {
    console.error("Deal verification lookup failed", dealError);
    return jsonError(500, "LOOKUP_FAILED", "Could not load verification state.");
  }

  if (!dealData) {
    return jsonError(404, "NOT_FOUND", "Verification link not found.");
  }

  const deal = dealData as PastDealVerifyRow;
  const requestUrl = new URL(request.url);
  const redirectUrl = new URL(`/verify/${encodeURIComponent(parsedToken.data)}`, request.url);
  const confirmedParam = requestUrl.searchParams.get("confirmed");

  if (confirmedParam === "true" || confirmedParam === "false") {
    redirectUrl.searchParams.set("confirmed", confirmedParam);
  }

  if (deal.verification_status === "verified") {
    redirectUrl.searchParams.set("state", "already-confirmed");
  } else if (deal.verification_status === "disputed") {
    redirectUrl.searchParams.set("state", "already-recorded");
  }

  return NextResponse.redirect(redirectUrl);
}
