import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Big Matt's BBQ | Frozen Drops",
  description: "Frozen-forward ordering for Big Matt's BBQ drops."
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable}`}>
      <body className="font-[var(--font-body)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
