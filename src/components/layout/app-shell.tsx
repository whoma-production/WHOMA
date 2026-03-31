"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { signOut } from "next-auth/react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getPublicSiteConfig } from "@/lib/public-site";
import { cn } from "@/lib/utils";

type ShellRole = "HOMEOWNER" | "AGENT" | "ADMIN";

interface NavItem {
  label: string;
  href: Route;
}

const navByRole: Record<ShellRole, NavItem[]> = {
  HOMEOWNER: [
    { label: "Create Sale Request", href: "/homeowner/instructions/new" },
    { label: "My Sale Requests", href: "/homeowner/instructions" },
    { label: "Agent Profiles", href: "/agents" },
    { label: "Messages", href: "/messages" }
  ],
  AGENT: [
    { label: "Onboarding", href: "/agent/onboarding" },
    { label: "Profile Builder", href: "/agent/profile/edit" },
    { label: "Agent Profiles", href: "/agents" },
    { label: "Seller Requests", href: "/agent/marketplace" },
    { label: "My Offers", href: "/agent/proposals" },
    { label: "Messages", href: "/messages" }
  ],
  ADMIN: [
    { label: "Agent Profiles", href: "/agents" },
    { label: "Seller Requests", href: "/agent/marketplace" },
    { label: "Verification", href: "/admin/agents" },
    { label: "Messages", href: "/messages" }
  ]
};

const roleLabel: Record<ShellRole, string> = {
  HOMEOWNER: "HOMEOWNER",
  AGENT: "REAL ESTATE AGENT",
  ADMIN: "ADMIN"
};

export function AppShell({ role, title, children }: { role: ShellRole; title: string; children: ReactNode }): JSX.Element {
  const navItems = navByRole[role];
  const site = getPublicSiteConfig();

  return (
    <div className="min-h-screen bg-surface-1">
      <header className="border-b border-line bg-surface-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Logo subtitle={site.logoSubtitle} />
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void signOut({ redirectTo: "/sign-in" });
              }}
            >
              Sign out
            </Button>
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
