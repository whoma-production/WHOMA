import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { assertCan } from "@/lib/auth/rbac";
import { logAgentProfileLinkShared } from "@/server/agent-profile/service";

const payloadSchema = z.object({
  profileSlug: z.string().trim().min(1).max(120).optional(),
  channel: z.string().trim().min(1).max(80).optional()
});

export async function POST(request: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "AGENT") {
    return NextResponse.json(
      { ok: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  assertCan(session.user.role, "agent:profile:edit");

  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Invalid payload." },
      { status: 400 }
    );
  }

  await logAgentProfileLinkShared(session.user.id, {
    ...(parsed.data.profileSlug ? { profileSlug: parsed.data.profileSlug } : {}),
    ...(parsed.data.channel ? { channel: parsed.data.channel } : {})
  });

  return NextResponse.json({ ok: true });
}
