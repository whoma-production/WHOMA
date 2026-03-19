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
  title: "WHOMA | Structured agent tendering for home sellers",
  description:
    "Homeowners launch a time-boxed instruction and compare structured estate agent proposals side-by-side."
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
