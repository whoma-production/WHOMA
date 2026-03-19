import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";

const benefits = {
  homeowners: [
    "Create one brief and receive multiple structured real estate agent offers in 24-48h.",
    "Compare fees, inclusions, timelines and terms side-by-side.",
    "Shortlist and award before chat opens."
  ],
  agents: [
    "Build a personal professional profile independent of agency brand.",
    "Appear in the public WHOMA real estate agent directory.",
    "Compete on service scope and pricing with a structured proposal format."
  ]
} as const;

export default function SignUpPage(): JSX.Element {
  const providerConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="min-h-screen bg-surface-1 px-4 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Logo subtitle="Where Home Owners Meet Real Estate Agents" />
          <Link href="/sign-in" className="text-sm font-medium text-brand-ink underline">
            Already have an account?
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Create your account</p>
          <h1>Join Whoma with Google</h1>
          <p className="max-w-3xl text-text-muted">
            We keep sign-up simple: continue with Google, then choose whether you are joining as a Homeowner or a Real Estate Agent in the next step.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-4">
            <h2 className="text-xl">For Homeowners</h2>
            <ul className="space-y-2 text-sm text-text-muted">
              {benefits.homeowners.map((item) => (
                <li key={item} className="rounded-md border border-line bg-surface-1 px-3 py-2">{item}</li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xl">For Real Estate Agents</h2>
            <ul className="space-y-2 text-sm text-text-muted">
              {benefits.agents.map((item) => (
                <li key={item} className="rounded-md border border-line bg-surface-1 px-3 py-2">{item}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mx-auto w-full max-w-xl space-y-4 text-center">
          <div className="space-y-1">
            <h2 className="text-xl">Start with Google</h2>
            <p className="text-sm text-text-muted">You will choose Homeowner or Real Estate Agent after sign-in.</p>
          </div>
          <GoogleAuthButton providerConfigured={providerConfigured} />
        </Card>
      </div>
    </main>
  );
}
