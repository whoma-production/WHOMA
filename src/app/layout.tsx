import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { Providers } from "@/app/providers";
import { getPublicSiteConfig } from "@/lib/public-site";

import "@/app/globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap"
});

export const metadata: Metadata = {
  title: "WHOMA | Verified identity for estate agents",
  description:
    "WHOMA is validating verified estate agent identity first: business email verification, structured public profiles, and trust-led pilot visibility before broader marketplace expansion."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <html lang="en-GB">
      <body className={montserrat.variable}>
        <a className="sr-only" href={`mailto:${site.supportEmail}`}>
          Contact {site.brandName} support
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
