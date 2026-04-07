import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isPreviewAccessEnabled } from "@/lib/auth/preview-access";
import {
  getAppleAuthProviderConfig,
  getEmailMagicLinkProviderConfig,
  getGoogleAuthProviderConfig,
  isEmailMagicLinkAuthEnabled
} from "@/lib/auth/provider-config";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? (process.env.NODE_ENV !== "production" ? "dev-only-nextauth-secret-change-me" : undefined);

const previewCredentialsSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["HOMEOWNER", "AGENT", "ADMIN"])
});

const previewDisplayNames: Record<UserRole, string> = {
  HOMEOWNER: "Preview Homeowner",
  AGENT: "Preview Estate Agent",
  ADMIN: "Preview Admin"
};

const googleProviderConfig = getGoogleAuthProviderConfig();
const appleProviderConfig = getAppleAuthProviderConfig();
const emailMagicProviderConfig = getEmailMagicLinkProviderConfig();

const googleProviders =
  googleProviderConfig
    ? [
        Google({
          clientId: googleProviderConfig.clientId,
          clientSecret: googleProviderConfig.clientSecret,
          allowDangerousEmailAccountLinking: true
        })
      ]
    : [];

const appleProviders =
  appleProviderConfig
    ? [
        Apple({
          clientId: appleProviderConfig.clientId,
          clientSecret: appleProviderConfig.clientSecret,
          allowDangerousEmailAccountLinking: true
        })
      ]
    : [];

const emailMagicLinkProviders = isEmailMagicLinkAuthEnabled() &&
  emailMagicProviderConfig
  ? [
      Email({
        id: "email",
        from: emailMagicProviderConfig.fromEmail,
        maxAge: 15 * 60,
        async sendVerificationRequest({ identifier, url }) {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${emailMagicProviderConfig.apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: emailMagicProviderConfig.fromEmail,
              to: [identifier],
              subject: "Your WHOMA sign-in link",
              text: `Use this secure link to sign in to WHOMA: ${url}\n\nThis link expires in 15 minutes.`,
              html: `<p>Use this secure link to sign in to WHOMA.</p><p><a href="${url}">Continue to sign in</a></p><p>This link expires in 15 minutes.</p>`
            })
          });

          if (!response.ok) {
            throw new Error("Magic-link delivery failed");
          }
        },
      })
    ]
  : [];

const previewAccessEnabled = isPreviewAccessEnabled();

const previewProviders =
  previewAccessEnabled
    ? [
        Credentials({
          id: "preview",
          name: "Preview Access",
          credentials: {
            email: { label: "Email", type: "email" },
            role: { label: "Role", type: "text" }
          },
          async authorize(rawCredentials) {
            const parsed = previewCredentialsSchema.safeParse(rawCredentials);

            if (!parsed.success) {
              return null;
            }

            const { email, role } = parsed.data;
            const displayName = previewDisplayNames[role];

            if (!process.env.DATABASE_URL) {
              return {
                id: `preview-${role.toLowerCase()}`,
                email,
                name: displayName,
                role
              };
            }

            const user = await prisma.user.upsert({
              where: { email },
              create: {
                email,
                name: displayName,
                role,
                dataOrigin: "PREVIEW"
              },
              update: {
                name: displayName,
                role,
                dataOrigin: "PREVIEW"
              }
            });

            return {
              id: user.id,
              email: user.email,
              name: user.name ?? displayName,
              role: user.role
            };
          }
        })
      ]
    : [];

const providers = [
  ...googleProviders,
  ...appleProviders,
  ...emailMagicLinkProviders,
  ...previewProviders
];
const authAdapter = PrismaAdapter(prisma) as Adapter;

type AccountAccessState = "APPROVED" | "PENDING" | "DENIED";

type TokenWithRole = {
  sub?: string;
  role?: UserRole | null;
  accessState?: AccountAccessState;
};

type AdapterUserLike = {
  id?: string;
  role?: UserRole | null;
};

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

const authConfig: NextAuthConfig = {
  adapter: authAdapter,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/sign-in"
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const nextToken = token as typeof token & TokenWithRole;

      if (user) {
        const adapterUser = user as typeof user & AdapterUserLike;
        nextToken.sub = adapterUser.id ?? nextToken.sub;
        nextToken.role = adapterUser.role ?? null;
        nextToken.accessState = await resolveAccountAccessState(
          adapterUser.id ?? undefined,
          adapterUser.role ?? null
        );
      }

      if (trigger === "update" && session?.user) {
        const sessionUser = session.user as typeof session.user & {
          id?: string;
          role?: UserRole | null;
          accessState?: AccountAccessState;
        };
        nextToken.sub = sessionUser.id ?? nextToken.sub;

        if (Object.prototype.hasOwnProperty.call(sessionUser, "role")) {
          nextToken.role = sessionUser.role ?? null;
        }

        if (Object.prototype.hasOwnProperty.call(sessionUser, "accessState")) {
          nextToken.accessState = sessionUser.accessState ?? "APPROVED";
        } else {
          nextToken.accessState = await resolveAccountAccessState(
            sessionUser.id ?? nextToken.sub ?? undefined,
            sessionUser.role ?? nextToken.role ?? null
          );
        }
      }

      return nextToken;
    },
    async session({ session, token }) {
      if (session.user) {
        const nextToken = token as typeof token & TokenWithRole;
        session.user.id = nextToken.sub ?? "";
        session.user.role = nextToken.role ?? null;
        session.user.accessState = nextToken.accessState ?? "APPROVED";
      }

      return session;
    }
  },
  logger: {
    error(code) {
      console.warn("[auth] error", { code });
    },
    warn(code) {
      console.warn("[auth] warn", { code });
    }
  }
};

if (authSecret) {
  authConfig.secret = authSecret;
}

export const { handlers, auth, signIn, signOut, unstable_update } =
  NextAuth(authConfig);
