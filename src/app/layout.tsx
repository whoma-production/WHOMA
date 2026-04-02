import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { Providers } from "@/app/providers";
import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";
import { getPublicSiteConfig } from "@/lib/public-site";

import "@/app/globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap"
});

export const metadata: Metadata = {
  title: "WHOMA | Identity and reputation infrastructure for estate agents",
  description:
    "WHOMA is a UK-first pilot for verified estate-agent identity, agent-owned reputation, and structured collaboration infrastructure."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <html lang="en-GB">
      <body className={montserrat.variable}>
        <a className="sr-only" href={`mailto:${site.supportEmail}`}>
          Contact {site.brandName} support
        </a>
        <Providers>
          {children}
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
