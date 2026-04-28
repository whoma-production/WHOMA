import Link from "next/link";
import { z } from "zod";

import { Logo } from "@/components/brand/logo";
import { VerifyDealResponseForm } from "@/components/deals/VerifyDealResponseForm";
import { prisma } from "@/lib/prisma";

interface VerifyDealPageProps {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type VerifyDealRow = {
  agent_name: string;
  property_address: string;
  completion_date: Date | null;
  verification_status: "unverified" | "pending" | "verified" | "disputed";
};

const tokenSchema = z.string().uuid("Invalid verification token.");

function readSingleSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
}

function parseConfirmedQuery(value: string | undefined): boolean | null {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function formatCompletionDate(value: Date | null): string {
  if (!value) {
    return "Not provided";
  }

  const parsed = new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "Europe/London"
  }).format(parsed);
}

export default async function VerifyDealPage({
  params,
  searchParams
}: VerifyDealPageProps): Promise<JSX.Element> {
  const { token } = await params;
  const parsedToken = tokenSchema.safeParse(token);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!parsedToken.success) {
    return (
      <main className="min-h-[100dvh] bg-white text-zinc-900 [font-family:var(--font-ui),system-ui,sans-serif]">
        <section className="mx-auto flex min-h-[100dvh] w-full max-w-4xl items-center px-6 py-10">
          <div className="space-y-3 rounded-xl border border-line bg-surface-1 p-6">
            <h1 className="text-2xl font-semibold text-text-strong">Invalid verification link</h1>
            <p className="text-sm text-text-muted">
              This verification link looks invalid. Please ask your estate agent
              to send a new request.
            </p>
            <Link
              href="/"
              className="inline-flex text-sm font-semibold text-[#2d6a5a] underline underline-offset-2"
            >
              Back to WHOMA
            </Link>
          </div>
        </section>
      </main>
    );
  }

  let deal: VerifyDealRow | null = null;
  try {
    const dealData = await prisma.pastDeal.findUnique({
      where: { verificationToken: parsedToken.data },
      select: {
        agentName: true,
        propertyAddress: true,
        completionDate: true,
        verificationStatus: true
      }
    });

    deal = dealData
      ? {
          agent_name: dealData.agentName,
          property_address: dealData.propertyAddress,
          completion_date: dealData.completionDate,
          verification_status: dealData.verificationStatus
        }
      : null;
  } catch (error) {
    console.error("Verify page lookup failed", error);
  }

  const queryConfirmed = parseConfirmedQuery(
    readSingleSearchParam(resolvedSearchParams?.confirmed)
  );
  const queryState = readSingleSearchParam(resolvedSearchParams?.state);

  const initialState: "active" | "already-confirmed" | "already-recorded" =
    !deal
      ? "already-recorded"
      : deal.verification_status === "verified" || queryState === "already-confirmed"
        ? "already-confirmed"
        : deal.verification_status === "disputed" || queryState === "already-recorded"
          ? "already-recorded"
          : "active";

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

          <div className="hidden md:block space-y-4">
            <p className="max-w-xs text-4xl font-medium leading-tight text-zinc-100">
              Where Home Owners Meet Agents
            </p>
            <p className="max-w-xs text-sm leading-6 text-zinc-400">
              This is how independent agents build verified reputations.
            </p>
          </div>
        </aside>

        <main className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-white px-6 py-10 md:col-span-3 md:min-h-[100dvh] md:px-14">
          <div className="w-full max-w-[620px] space-y-5">
            <section className="space-y-4 rounded-xl border border-line bg-surface-1 p-5">
              <h1 className="text-2xl font-semibold text-text-strong">
                Past sale verification
              </h1>

              {!deal ? (
                <p className="text-sm text-text-muted">
                  This verification request was not found or is no longer
                  available.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        Agent
                      </p>
                      <p className="mt-1 text-sm font-medium text-text-strong">
                        {deal.agent_name}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        Property address
                      </p>
                      <p className="mt-1 text-sm font-medium text-text-strong">
                        {deal.property_address}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                        Completion date
                      </p>
                      <p className="mt-1 text-sm font-medium text-text-strong">
                        {formatCompletionDate(deal.completion_date)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>

            {deal ? (
              <VerifyDealResponseForm
                token={parsedToken.data}
                agentName={deal.agent_name}
                initialConfirmed={queryConfirmed}
                initialState={initialState}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
