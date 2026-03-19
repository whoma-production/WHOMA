import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import { createInstructionSchema } from "@/lib/validation/instruction";

function jsonError(status: number, error: string, details?: unknown): Response {
  return NextResponse.json({ error, details }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "Authentication required.");
  }

  if (!session.user.role) {
    return jsonError(403, "Role onboarding required before creating instructions.");
  }

  if (session.user.role !== "HOMEOWNER") {
    return jsonError(403, "Only homeowners can create instructions.");
  }

  assertCan(session.user.role, "instruction:create");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = createInstructionSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed.", parsed.error.flatten());
  }

  const inferredStatus = parsed.data.bidWindowStartAt <= new Date() ? "LIVE" : "DRAFT";

  return NextResponse.json(
    {
      ok: true,
      message: "Instruction payload validated and authorized. Prisma persistence is next.",
      actor: { id: session.user.id, email: session.user.email, role: session.user.role },
      inferredStatus,
      instruction: parsed.data
    },
    { status: 201 }
  );
}
