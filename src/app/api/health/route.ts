import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(): Promise<Response> {
  let database: "up" | "down" | "unconfigured" = "unconfigured";
  let status: "ok" | "degraded" = "ok";

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
      status = "degraded";
    }
  }

  return NextResponse.json(
    {
      status,
      service: "whoma-mvp",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database
      }
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
