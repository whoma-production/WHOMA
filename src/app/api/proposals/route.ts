import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import { proposalSubmissionSchema } from "@/lib/validation/proposal";

function jsonError(status: number, error: string, details?: unknown): Response {
  return NextResponse.json({ error, details }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return jsonError(401, "Authentication required.");
  }

  if (!session.user.role) {
    return jsonError(403, "Role onboarding required before submitting proposals.");
  }

  if (session.user.role !== "AGENT") {
    return jsonError(403, "Only real estate agents can submit proposals.");
  }

  assertCan(session.user.role, "proposal:submit");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const parsed = proposalSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "Validation failed.", parsed.error.flatten());
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Proposal payload validated and authorized. Prisma persistence is next.",
      actor: { id: session.user.id, email: session.user.email, role: session.user.role },
      proposal: parsed.data
    },
    { status: 201 }
  );
}
