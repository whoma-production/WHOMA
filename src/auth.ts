import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? (process.env.NODE_ENV !== "production" ? "dev-only-nextauth-secret-change-me" : undefined);

const previewCredentialsSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(["HOMEOWNER", "AGENT"])
});

const googleProviders =
  googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret
        })
      ]
    : [];

const previewProviders =
  process.env.NODE_ENV !== "production"
    ? [
        Credentials({
          id: "preview",
          name: "Preview Access",
          credentials: {
            email: { label: "Email", type: "email" },
            role: { label: "Role", type: "text" }
          },
          authorize(rawCredentials) {
            const parsed = previewCredentialsSchema.safeParse(rawCredentials);

            if (!parsed.success) {
              return null;
            }

            const { email, role } = parsed.data;
            const isHomeowner = role === "HOMEOWNER";

            return {
              id: isHomeowner ? "preview-homeowner" : "preview-agent",
              email,
              name: isHomeowner ? "Preview Homeowner" : "Preview Agent",
              role
            };
          }
        })
      ]
    : [];

const providers = [...googleProviders, ...previewProviders];

type TokenWithRole = {
  sub?: string;
  role?: UserRole | null;
};

type AdapterUserLike = {
  id?: string;
  role?: UserRole | null;
};

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt"
  },
  secret: authSecret,
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
});
