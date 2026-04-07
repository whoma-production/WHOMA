import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { Providers } from "@/app/providers";
import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";
import { getPublicSiteConfig } from "@/lib/public-site";

import "@/app/globals.css";

const montserratUi = Montserrat({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap"
});

const montserratDisplay = Montserrat({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "WHOMA | Where Home Owners Meet Agents",
  description:
    "WHOMA helps independent estate agents build verified identity, publish trusted profiles, and open collaboration opportunities."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <html lang="en-GB">
      <body className={`${montserratUi.variable} ${montserratDisplay.variable}`}>
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
