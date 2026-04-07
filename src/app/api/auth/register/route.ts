import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  emailPasswordRegisterSchema,
  hashPassword
} from "@/lib/auth/password-auth";

function getProviderLabel(provider: string): string {
  switch (provider) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "resend":
      return "email link";
    case "email-login":
      return "email and password";
    default:
      return provider;
  }
}

function joinLabels(labels: string[]): string {
  const [first, second] = labels;

  if (labels.length === 0) {
    return "your original sign-in method";
  }

  if (labels.length === 1 && first) {
    return first;
  }

  if (labels.length === 2 && first && second) {
    return `${first} or ${second}`;
  }

  const last = labels[labels.length - 1] ?? "your original sign-in method";

  return `${labels.slice(0, -1).join(", ")}, or ${last}`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: "EMAIL_AUTH_UNAVAILABLE",
        message: "Email account creation is not available right now."
      },
      { status: 503 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_JSON",
        message: "We could not read that request."
      },
      { status: 400 }
    );
  }

  const parsed = emailPasswordRegisterSchema.safeParse(payload);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: issue?.message ?? "Check your details and try again."
      },
      { status: 400 }
    );
  }

  const { email, name, password } = parsed.data;
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      accounts: {
        select: {
          provider: true
        }
      }
    }
  });

  if (existingUser) {
    const providerLabels: string[] = Array.from(
      new Set(
        existingUser.accounts
          .map((account) => account.provider)
          .filter((provider): provider is string => provider !== "preview")
          .map(getProviderLabel)
      )
    );
    const message =
      providerLabels.length > 0
        ? `This email already has a WHOMA account. Sign in with ${joinLabels(providerLabels)}.`
        : "This email already has a WHOMA account. Sign in instead.";

    return NextResponse.json(
      {
        error: "ACCOUNT_EXISTS",
        message
      },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      passwordSetAt: now,
      dataOrigin: "PRODUCTION"
    },
    select: {
      id: true
    }
  });

  return NextResponse.json(
    {
      ok: true,
      userId: user.id
    },
    { status: 201 }
  );
}
