import { NextResponse } from "next/server";

import { sendAgentVerificationOutcomeEmail } from "@/lib/email/verification";
import { prisma } from "@/lib/prisma";
import { confirmPastDealSchema } from "@/lib/validation/deals";

type PastDealConfirmRow = {
  id: string;
  agentName: string;
  agentEmail: string;
  propertyAddress: string;
  completionDate: Date | null;
  verificationStatus: "unverified" | "pending" | "verified" | "disputed";
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

function formatDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
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

  let foundDeal: PastDealConfirmRow | null = null;
  try {
    foundDeal = await prisma.pastDeal.findUnique({
      where: { verificationToken: parsed.data.token },
      select: {
        id: true,
        agentName: true,
        agentEmail: true,
        propertyAddress: true,
        completionDate: true,
        verificationStatus: true
      }
    });
  } catch (error) {
    console.error("Deal verification confirm lookup failed", error);
    return jsonError(500, "LOOKUP_FAILED", "Could not load the verification record.");
  }

  if (!foundDeal) {
    return jsonError(404, "NOT_FOUND", "Verification link not found.");
  }

  if (
    foundDeal.verificationStatus !== "pending" &&
    foundDeal.verificationStatus !== "unverified"
  ) {
    return jsonError(
      409,
      "ALREADY_RECORDED",
      "This verification response has already been recorded.",
      { verificationStatus: foundDeal.verificationStatus }
    );
  }

  const nextStatus = parsed.data.confirmed ? "verified" : "disputed";
  const sellerComment = parsed.data.sellerComment?.trim() || null;

  let updatedDeal: PastDealConfirmRow | null = null;
  try {
    const updateResult = await prisma.pastDeal.updateMany({
      where: {
        verificationToken: parsed.data.token,
        verificationStatus: { in: ["pending", "unverified"] }
      },
      data: {
        verificationStatus: nextStatus,
        verifiedAt: new Date(),
        sellerComment
      }
    });

    if (updateResult.count > 0) {
      updatedDeal = await prisma.pastDeal.findUnique({
        where: { verificationToken: parsed.data.token },
        select: {
          id: true,
          agentName: true,
          agentEmail: true,
          propertyAddress: true,
          completionDate: true,
          verificationStatus: true
        }
      });
    }
  } catch (error) {
    console.error("Deal verification confirm update failed", error);
    return jsonError(500, "UPDATE_FAILED", "Could not save the verification response.");
  }

  if (!updatedDeal) {
    return jsonError(
      409,
      "ALREADY_RECORDED",
      "This verification response has already been recorded."
    );
  }

  try {
    await sendAgentVerificationOutcomeEmail({
      agentEmail: updatedDeal.agentEmail,
      agentName: updatedDeal.agentName,
      propertyAddress: updatedDeal.propertyAddress,
      completionDate: formatDateOnly(updatedDeal.completionDate),
      sellerComment,
      confirmed: parsed.data.confirmed
    });
  } catch (error) {
    console.warn("Agent verification outcome email failed", error);
  }

  return jsonSuccess(200, {
    dealId: updatedDeal.id,
    verificationStatus: updatedDeal.verificationStatus
  });
}
