import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";

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

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${nunitoSans.variable}`}>
      <body className="flex min-h-screen flex-col font-[var(--font-body)]">
        <Providers>
          <NavBar />
          <div id="page-content">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
