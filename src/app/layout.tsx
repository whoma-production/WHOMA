import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { Providers } from "@/app/providers";

import "@/app/globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap"
});

export const metadata: Metadata = {
  title: "WHOMA | Real Estate Agent Profiles and Structured Home-Seller Tendering",
  description:
    "Real estate agents build public professional profiles while homeowners compare structured agent proposals side-by-side."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  return (
    <html lang="en-GB">
      <body className={montserrat.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
