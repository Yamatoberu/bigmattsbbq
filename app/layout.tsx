import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Playfair_Display, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";
import { SCA_AREA_HEADER } from "../lib/sca/routing";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Big Matt's BBQ | Frozen Drops",
  description: "Frozen-forward ordering for Big Matt's BBQ drops."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  const isScaArea = (await headers()).get(SCA_AREA_HEADER) === "1";

  return (
    <html lang="en" className={`${playfair.variable} ${nunitoSans.variable}`}>
      <body className="flex min-h-screen flex-col font-[var(--font-body)]">
        <Providers>
          {isScaArea ? (
            <div id="page-content">{children}</div>
          ) : (
            <>
              <NavBar />
              <div id="page-content">{children}</div>
              <Footer />
            </>
          )}
        </Providers>
      </body>
    </html>
  );
}
