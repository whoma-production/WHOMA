import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { sendVerificationEmail } from "@/lib/email/verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addPastDealSchema } from "@/lib/validation/deals";

type PastDealRow = {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_email: string;
  property_address: string;
  property_postcode: string;
  sale_price: number | null;
  completion_date: string | null;
  role: "sole_agent" | "joint_agent" | "referral";
  seller_email: string | null;
  seller_name: string | null;
  verification_status: "unverified" | "pending" | "verified" | "disputed";
  verification_token: string;
  verification_sent_at: string | null;
  verified_at: string | null;
  seller_comment: string | null;
  created_at: string;
};

const supabaseUserIdSchema = z.string().uuid();

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

function mapDealForClient(deal: PastDealRow): {
  id: string;
  propertyAddress: string;
  propertyPostcode: string;
  salePricePence: number | null;
  completionDate: string | null;
  role: "sole_agent" | "joint_agent" | "referral";
  sellerEmail: string | null;
  sellerName: string | null;
  verificationStatus: "unverified" | "pending" | "verified" | "disputed";
  verificationSentAt: string | null;
  verifiedAt: string | null;
  sellerComment: string | null;
  createdAt: string;
} {
  return {
    id: deal.id,
    propertyAddress: deal.property_address,
    propertyPostcode: deal.property_postcode,
    salePricePence: deal.sale_price,
    completionDate: deal.completion_date,
    role: deal.role,
    sellerEmail: deal.seller_email,
    sellerName: deal.seller_name,
    verificationStatus: deal.verification_status,
    verificationSentAt: deal.verification_sent_at,
    verifiedAt: deal.verified_at,
    sellerComment: deal.seller_comment,
    createdAt: deal.created_at
  };
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  if (session.user.role !== "AGENT") {
    return jsonError(403, "FORBIDDEN_ROLE", "Only agents can add past deals.");
  }

  const parsedSupabaseUserId = supabaseUserIdSchema.safeParse(
    session.user.supabaseUserId
  );

  if (!parsedSupabaseUserId.success) {
    return jsonError(
      403,
      "INVALID_AGENT_IDENTITY",
      "Supabase agent identity is missing."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid JSON body.");
  }

  const parsed = addPastDealSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_FAILED",
      "Validation failed.",
      parsed.error.flatten()
    );
  }

  const supabase = await createSupabaseServerClient();
  const sellerName = parsed.data.sellerName?.trim() || null;
  const sellerEmail = parsed.data.sellerEmail?.trim().toLowerCase() || null;
  const salePricePence =
    parsed.data.salePrice !== null && parsed.data.salePrice !== undefined
      ? Math.round(parsed.data.salePrice * 100)
      : null;

  const insertPayload = {
    agent_id: parsedSupabaseUserId.data,
    agent_name: session.user.name?.trim() || "Estate agent",
    agent_email: session.user.email.trim().toLowerCase(),
    property_address: parsed.data.propertyAddress.trim(),
    property_postcode: parsed.data.propertyPostcode,
    sale_price: salePricePence,
    completion_date: parsed.data.completionDate,
    role: parsed.data.role,
    seller_email: sellerEmail,
    seller_name: sellerName
  };

  const { data: createdDealData, error: createError } = await supabase
    .from("past_deals")
    .insert(insertPayload)
    .select("*")
    .single();

  if (createError || !createdDealData) {
    console.error("Past deal create failed", createError);
    return jsonError(500, "DEAL_CREATE_FAILED", "Could not add the past deal.");
  }

  let savedDeal = createdDealData as PastDealRow;
  let verificationRequested = false;

  if (sellerEmail) {
    try {
      await sendVerificationEmail({
        sellerEmail,
        sellerName,
        agentName: savedDeal.agent_name,
        propertyAddress: savedDeal.property_address,
        verificationToken: savedDeal.verification_token
      });

      const { data: updatedDealData, error: updateError } = await supabase
        .from("past_deals")
        .update({
          verification_status: "pending",
          verification_sent_at: new Date().toISOString()
        })
        .eq("id", savedDeal.id)
        .select("*")
        .single();

      if (updateError || !updatedDealData) {
        console.error("Past deal verification update failed", updateError);
        return jsonError(
          500,
          "DEAL_VERIFICATION_STATE_FAILED",
          "Deal was added but verification state could not be updated."
        );
      }

      savedDeal = updatedDealData as PastDealRow;
      verificationRequested = true;
    } catch (error) {
      console.error("Past deal verification email failed", error);
      return jsonError(
        502,
        "VERIFICATION_EMAIL_FAILED",
        "Deal was added, but we could not send a verification email right now."
      );
    }
  }

  return jsonSuccess(201, {
    deal: mapDealForClient(savedDeal),
    verificationRequested
  });
}
