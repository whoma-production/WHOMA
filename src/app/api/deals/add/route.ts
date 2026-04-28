import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { sendVerificationEmail } from "@/lib/email/verification";
import { prisma } from "@/lib/prisma";
import { addPastDealSchema } from "@/lib/validation/deals";

type PastDealRow = {
  id: string;
  agentId: string;
  agentName: string;
  agentEmail: string;
  propertyAddress: string;
  propertyPostcode: string;
  salePrice: number | null;
  completionDate: Date | null;
  role: "sole_agent" | "multi_agent" | "buyers_agent";
  sellerEmail: string | null;
  sellerName: string | null;
  verificationStatus: "unverified" | "pending" | "verified" | "disputed";
  verificationToken: string;
  verificationSentAt: Date | null;
  verifiedAt: Date | null;
  sellerComment: string | null;
  createdAt: Date;
};

const userIdSchema = z.string().min(1);

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
  role: "sole_agent" | "multi_agent" | "buyers_agent";
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
    propertyAddress: deal.propertyAddress,
    propertyPostcode: deal.propertyPostcode,
    salePricePence: deal.salePrice,
    completionDate: formatDateOnly(deal.completionDate),
    role: deal.role,
    sellerEmail: deal.sellerEmail,
    sellerName: deal.sellerName,
    verificationStatus: deal.verificationStatus,
    verificationSentAt: deal.verificationSentAt?.toISOString() ?? null,
    verifiedAt: deal.verifiedAt?.toISOString() ?? null,
    sellerComment: deal.sellerComment,
    createdAt: deal.createdAt.toISOString()
  };
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  if (session.user.role !== "AGENT") {
    return jsonError(403, "FORBIDDEN_ROLE", "Only agents can add past deals.");
  }

  const parsedUserId = userIdSchema.safeParse(session.user.id);

  if (!parsedUserId.success) {
    return jsonError(
      403,
      "INVALID_AGENT_IDENTITY",
      "Agent identity is missing."
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

  const sellerName = parsed.data.sellerName?.trim() || null;
  const sellerEmail = parsed.data.sellerEmail?.trim().toLowerCase() || null;
  const salePricePence =
    parsed.data.salePrice !== null && parsed.data.salePrice !== undefined
      ? Math.round(parsed.data.salePrice * 100)
      : null;

  const insertPayload = {
    agentId: parsedUserId.data,
    agentName: session.user.name?.trim() || "Estate agent",
    agentEmail: session.user.email.trim().toLowerCase(),
    propertyAddress: parsed.data.propertyAddress.trim(),
    propertyPostcode: parsed.data.propertyPostcode,
    salePrice: salePricePence,
    completionDate: parseDateOnly(parsed.data.completionDate),
    role: parsed.data.role,
    sellerEmail,
    sellerName
  };

  let savedDeal: PastDealRow;
  try {
    savedDeal = await prisma.pastDeal.create({
      data: insertPayload
    });
  } catch (error) {
    console.error("Past deal create failed", error);
    return jsonError(500, "DEAL_CREATE_FAILED", "Could not add the past deal.");
  }

  let verificationRequested = false;
  let verificationWarning: string | null = null;

  if (sellerEmail) {
    try {
      await sendVerificationEmail({
        sellerEmail,
        sellerName,
        agentName: savedDeal.agentName,
        propertyAddress: savedDeal.propertyAddress,
        verificationToken: savedDeal.verificationToken
      });

      savedDeal = await prisma.pastDeal.update({
        where: { id: savedDeal.id },
        data: {
          verificationStatus: "pending",
          verificationSentAt: new Date()
        }
      });
      verificationRequested = true;
    } catch (error) {
      console.error("Past deal verification request failed", error);
      verificationWarning =
        "Deal added. We could not send the seller verification email right now.";
    }
  }

  return jsonSuccess(201, {
    deal: mapDealForClient(savedDeal),
    verificationRequested,
    verificationWarning
  });
}
