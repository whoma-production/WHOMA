import { NextResponse } from "next/server";

import { sendAgentVerificationOutcomeEmail } from "@/lib/email/verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmPastDealSchema } from "@/lib/validation/deals";

type PastDealConfirmRow = {
  id: string;
  agent_name: string;
  agent_email: string;
  property_address: string;
  completion_date: string | null;
  verification_status: "unverified" | "pending" | "verified" | "disputed";
};

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details }
    },
    { status }
  );
}

function jsonSuccess(status: number, data: unknown): Response {
  return NextResponse.json(
    {
      ok: true,
      data
    },
    { status }
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const parsed = confirmPastDealSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "Validation failed.",
      parsed.error.flatten()
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: foundDealData, error: findError } = await supabase
    .from("past_deals")
    .select("id, agent_name, agent_email, property_address, completion_date, verification_status")
    .eq("verification_token", parsed.data.token)
    .maybeSingle();

  if (findError) {
    console.error("Deal verification confirm lookup failed", findError);
    return jsonError(500, "LOOKUP_FAILED", "Could not load the verification record.");
  }

  if (!foundDealData) {
    return jsonError(404, "NOT_FOUND", "Verification link not found.");
  }

  const foundDeal = foundDealData as PastDealConfirmRow;

  if (
    foundDeal.verification_status !== "pending" &&
    foundDeal.verification_status !== "unverified"
  ) {
    return jsonError(
      409,
      "ALREADY_RECORDED",
      "This verification response has already been recorded.",
      { verificationStatus: foundDeal.verification_status }
    );
  }

  const nextStatus = parsed.data.confirmed ? "verified" : "disputed";
  const sellerComment = parsed.data.sellerComment?.trim() || null;

  const { data: updatedDealData, error: updateError } = await supabase
    .from("past_deals")
    .update({
      verification_status: nextStatus,
      verified_at: new Date().toISOString(),
      seller_comment: sellerComment
    })
    .eq("verification_token", parsed.data.token)
    .in("verification_status", ["pending", "unverified"])
    .select("id, agent_name, agent_email, property_address, completion_date, verification_status")
    .maybeSingle();

  if (updateError) {
    console.error("Deal verification confirm update failed", updateError);
    return jsonError(500, "UPDATE_FAILED", "Could not save the verification response.");
  }

  if (!updatedDealData) {
    return jsonError(
      409,
      "ALREADY_RECORDED",
      "This verification response has already been recorded."
    );
  }

  const updatedDeal = updatedDealData as PastDealConfirmRow;

  try {
    await sendAgentVerificationOutcomeEmail({
      agentEmail: updatedDeal.agent_email,
      agentName: updatedDeal.agent_name,
      propertyAddress: updatedDeal.property_address,
      completionDate: updatedDeal.completion_date,
      sellerComment,
      confirmed: parsed.data.confirmed
    });
  } catch (error) {
    console.warn("Agent verification outcome email failed", error);
  }

  return jsonSuccess(200, {
    dealId: updatedDeal.id,
    verificationStatus: updatedDeal.verification_status
  });
}
