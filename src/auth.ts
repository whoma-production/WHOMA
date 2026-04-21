import type { UserRole } from "@prisma/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACCESS_HINT_COOKIE_MAX_AGE_SECONDS,
  ACCESS_HINT_COOKIE_NAME,
  type AccountAccessState,
  encodeAccessHint
} from "@/lib/auth/access-hint";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthSessionUser {
  id: string;
  supabaseUserId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole | null;
  accessState: AccountAccessState;
}

export interface AuthSession {
  user: AuthSessionUser;
}

interface SignOutOptions {
  redirectTo?: string;
}

interface UpdateSessionPayload {
  user?: {
    role?: UserRole | null;
  };
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getSupabaseUserName(user: SupabaseUser): string | null {
  const metadata = user.user_metadata;

  return (
    readString(metadata?.full_name) ??
    readString(metadata?.name) ??
    readString(metadata?.preferred_username) ??
    null
  );
}

function getSupabaseUserAvatar(user: SupabaseUser): string | null {
  const metadata = user.user_metadata;

  return (
    readString(metadata?.avatar_url) ??
    readString(metadata?.picture) ??
    null
  );
}

async function resolveAccountAccessState(
  userId: string | undefined,
  role: UserRole | null | undefined
): Promise<AccountAccessState> {
  if (!userId || role !== "AGENT" || !process.env.DATABASE_URL) {
    return "APPROVED";
  }

  const profile = await prisma.agentProfile.findUnique({
    where: { userId },
    select: {
      onboardingCompletedAt: true,
      profileStatus: true,
      verificationStatus: true
    }
  });

  if (!profile) {
    return "APPROVED";
  }

  if (profile.verificationStatus === "REJECTED") {
    return "DENIED";
  }

  if (
    profile.onboardingCompletedAt &&
    profile.profileStatus === "PUBLISHED" &&
    profile.verificationStatus === "PENDING"
  ) {
    return "PENDING";
  }

  return "APPROVED";
}

async function setAccessHintIfPossible(user: {
  id: string;
  supabaseUserId: string;
  role: UserRole | null;
  accessState: AccountAccessState;
}): Promise<void> {
  const cookieStore = await cookies();

  try {
    cookieStore.set({
      name: ACCESS_HINT_COOKIE_NAME,
      value: encodeAccessHint({
        userId: user.id,
        supabaseUserId: user.supabaseUserId,
        role: user.role,
        accessState: user.accessState
      }),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACCESS_HINT_COOKIE_MAX_AGE_SECONDS
    });
  } catch {
    // Read-only contexts (RSC) cannot set cookies.
  }
}

async function clearAccessHintIfPossible(): Promise<void> {
  const cookieStore = await cookies();

  try {
    cookieStore.delete(ACCESS_HINT_COOKIE_NAME);
  } catch {
    // Read-only contexts (RSC) cannot set cookies.
  }
}

async function syncWhomaUserFromSupabase(
  supabaseUser: SupabaseUser
): Promise<AuthSessionUser | null> {
  const email = readString(supabaseUser.email)?.toLowerCase();

  if (!email || !process.env.DATABASE_URL) {
    return null;
  }

  const name = getSupabaseUserName(supabaseUser);
  const image = getSupabaseUserAvatar(supabaseUser);
  const emailVerifiedAt = supabaseUser.email_confirmed_at
    ? new Date(supabaseUser.email_confirmed_at)
    : null;

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      image,
      emailVerified: emailVerifiedAt,
      dataOrigin: "PRODUCTION"
    },
    update: {
      ...(name ? { name } : {}),
      ...(image ? { image } : {}),
      ...(emailVerifiedAt ? { emailVerified: emailVerifiedAt } : {})
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true
    }
  });

  const accessState = await resolveAccountAccessState(user.id, user.role);

  return {
    id: user.id,
    supabaseUserId: supabaseUser.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    accessState
  };
}

export async function auth(): Promise<AuthSession | null> {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;

  try {
    supabase = await createSupabaseServerClient();
  } catch {
    await clearAccessHintIfPossible();
    return null;
  }

  const {
    data: { user: supabaseUser },
    error
  } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    await clearAccessHintIfPossible();
    return null;
  }

  const syncedUser = await syncWhomaUserFromSupabase(supabaseUser);

  if (!syncedUser) {
    await clearAccessHintIfPossible();
    return null;
  }

  await setAccessHintIfPossible(syncedUser);

  return {
    user: syncedUser
  };
}

export async function signOut(options?: SignOutOptions): Promise<void> {
  await clearAccessHintIfPossible();

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // If Supabase is unavailable, still clear local access state.
  }

  if (options?.redirectTo) {
    const destination = options.redirectTo.startsWith("/")
      ? options.redirectTo
      : "/sign-in";
    redirect(destination as Parameters<typeof redirect>[0]);
  }
}

export async function unstable_update(
  payload: UpdateSessionPayload
): Promise<void> {
  const session = await auth();

  if (!session?.user.id) {
    return;
  }

  const nextRole = payload.user?.role ?? session.user.role;
  const nextAccessState = await resolveAccountAccessState(
    session.user.id,
    nextRole
  );

  await setAccessHintIfPossible({
    id: session.user.id,
    supabaseUserId: session.user.supabaseUserId,
    role: nextRole,
    accessState: nextAccessState
  });
}
