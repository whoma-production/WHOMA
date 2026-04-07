import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isPreviewAccessEnabled } from "@/lib/auth/preview-access";
import {
  emailPasswordSignInSchema,
  verifyPassword
} from "@/lib/auth/password-auth";
import {
  getAppleAuthProviderConfig,
  getGoogleAuthProviderConfig,
  isEmailPasswordAuthEnabled
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

const googleProviders =
  googleProviderConfig
    ? [
        Google({
          clientId: googleProviderConfig.clientId,
          clientSecret: googleProviderConfig.clientSecret
        })
      ]
    : [];

const appleProviders =
  appleProviderConfig
    ? [
        Apple({
          clientId: appleProviderConfig.clientId,
          clientSecret: appleProviderConfig.clientSecret
        })
      ]
    : [];

const emailPasswordProviders = isEmailPasswordAuthEnabled()
  ? [
      Credentials({
        id: "email-login",
        name: "Email and Password",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(rawCredentials) {
          const parsed = emailPasswordSignInSchema.safeParse(rawCredentials);

          if (!parsed.success || !process.env.DATABASE_URL) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              passwordHash: true
            }
          });

          if (!user?.passwordHash) {
            return null;
          }

          const passwordMatches = await verifyPassword(
            parsed.data.password,
            user.passwordHash
          );

          if (!passwordMatches) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
        }
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
  ...emailPasswordProviders,
  ...previewProviders
];
const authAdapter = PrismaAdapter(prisma) as Adapter;

type TokenWithRole = {
  sub?: string;
  role?: UserRole | null;
};

type AdapterUserLike = {
  id?: string;
  role?: UserRole | null;
};

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
      }

      if (trigger === "update" && session?.user) {
        const sessionUser = session.user as typeof session.user & { id?: string; role?: UserRole | null };
        nextToken.sub = sessionUser.id ?? nextToken.sub;

        if (Object.prototype.hasOwnProperty.call(sessionUser, "role")) {
          nextToken.role = sessionUser.role ?? null;
        }
      }

      return nextToken;
    },
    async session({ session, token }) {
      if (session.user) {
        const nextToken = token as typeof token & TokenWithRole;
        session.user.id = nextToken.sub ?? "";
        session.user.role = nextToken.role ?? null;
      }

      return session;
    }
  }
};

if (authSecret) {
  authConfig.secret = authSecret;
}

export const { handlers, auth, signIn, signOut, unstable_update } =
  NextAuth(authConfig);
