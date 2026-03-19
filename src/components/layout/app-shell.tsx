import Link from "next/link";
import type { ReactNode } from "react";

import { auth, signOut } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShellRole = "HOMEOWNER" | "AGENT" | "ADMIN";

interface NavItem {
  label: string;
  href: string;
}

const navByRole: Record<ShellRole, NavItem[]> = {
  HOMEOWNER: [
    { label: "Create Instruction", href: "/homeowner/instructions/new" },
    { label: "My Instructions", href: "/homeowner/instructions" },
    { label: "Agent Directory", href: "/agents" },
    { label: "Messages", href: "/messages" }
  ],
  AGENT: [
    { label: "Onboarding", href: "/agent/onboarding" },
    { label: "CV Builder", href: "/agent/profile/edit" },
    { label: "Public Directory", href: "/agents" },
    { label: "Marketplace", href: "/agent/marketplace" },
    { label: "My Proposals", href: "/agent/proposals" },
    { label: "Messages", href: "/messages" }
  ],
  ADMIN: [
    { label: "Agent Directory", href: "/agents" },
    { label: "Marketplace", href: "/agent/marketplace" },
    { label: "Verification", href: "/admin/agents" },
    { label: "Messages", href: "/messages" }
  ]
};

const roleLabel: Record<ShellRole, string> = {
  HOMEOWNER: "HOMEOWNER",
  AGENT: "REAL ESTATE AGENT",
  ADMIN: "ADMIN"
};

export async function AppShell({ role, title, children }: { role: ShellRole; title: string; children: ReactNode }): Promise<JSX.Element> {
  const navItems = navByRole[role];
  const session = await auth();

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Logo subtitle="Where Home Owners Meet Real Estate Agents" />
            <Badge variant="accent">{roleLabel[role]}</Badge>
          </div>
          <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn(buttonVariants({ variant: "tertiary", size: "sm" }))}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session?.user ? (
              <>
                <span className="hidden text-xs text-text-muted md:inline">{session.user.email}</span>
                <form
                  action={async (): Promise<void> => {
                    "use server";
                    await signOut({ redirectTo: "/sign-in" });
                  }}
                >
                  <Button type="submit" variant="secondary" size="sm">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <Link href="/sign-in" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text-strong">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}
