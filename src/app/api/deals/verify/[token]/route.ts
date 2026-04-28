import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

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
  context: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await context.params;
  const parsedToken = tokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return jsonError(400, "INVALID_TOKEN", "Invalid verification token.");
  }

  let deal: PastDealVerifyRow | null = null;
  try {
    const dealData = await prisma.pastDeal.findUnique({
      where: { verificationToken: parsedToken.data },
      select: { verificationStatus: true }
    });

    deal = dealData
      ? {
          verification_status: dealData.verificationStatus
        }
      : null;
  } catch (error) {
    console.error("Deal verification lookup failed", error);
    return jsonError(500, "LOOKUP_FAILED", "Could not load verification state.");
  }

  if (!deal) {
    return jsonError(404, "NOT_FOUND", "Verification link not found.");
  }

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
