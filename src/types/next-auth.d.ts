import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

type AccountAccessState = "APPROVED" | "PENDING" | "DENIED";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole | null;
      accessState: AccountAccessState;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole | null;
    accessState?: AccountAccessState;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole | null;
    accessState?: AccountAccessState;
  }
}
