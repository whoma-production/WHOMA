import Link from "next/link";

import { PublicHeader } from "@/components/layout/public-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AuthErrorPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-surface-1">
      <PublicHeader />
      <main className="grid px-4 py-10">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>We couldn&apos;t complete sign-in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-muted">
              Please try signing in again. If this keeps happening, contact
              support.
            </p>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "primary" }), "w-full")}
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
