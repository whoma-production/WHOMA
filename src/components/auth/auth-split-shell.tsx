import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

interface AuthSplitShellProps {
  valueProp: string;
  stepLabel?: string;
  children: ReactNode;
}

export function AuthSplitShell({
  valueProp,
  stepLabel,
  children
}: AuthSplitShellProps): JSX.Element {
  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 [font-family:var(--font-ui),system-ui,sans-serif]">
      <div className="md:grid md:min-h-[100dvh] md:grid-cols-5">
        <aside className="flex h-16 items-center bg-zinc-950 px-5 md:col-span-2 md:h-auto md:min-h-[100dvh] md:flex-col md:items-start md:justify-between md:px-10 md:py-8">
          <div className="md:hidden">
            <Logo compact className="[&_*]:!text-white" />
          </div>

          <div className="hidden md:block">
            <Logo className="[&_*]:!text-white" />
          </div>

          <div className="hidden md:block">
            <p className="max-w-xs text-4xl font-medium leading-tight text-zinc-100">
              {valueProp}
            </p>
          </div>

          <p className="hidden text-sm text-zinc-500 md:block">{stepLabel ?? ""}</p>
        </aside>

        <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-white px-6 py-10 md:col-span-3 md:min-h-[100dvh] md:px-14">
          <div className="w-full max-w-[560px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
