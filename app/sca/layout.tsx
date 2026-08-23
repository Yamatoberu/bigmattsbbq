import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ScaNavBar } from "../../components/sca/ScaNavBar";
import { ScaFooter } from "../../components/sca/ScaFooter";

export const metadata: Metadata = {
  title: "SCA Tracker | Big Matt's BBQ",
  description: "Big Matt's SCA steak cookoff history — cooks, scores, and AI appearance reviews."
};

export default function ScaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <ScaNavBar />
      <main className="flex-1">{children}</main>
      <ScaFooter />
    </div>
  );
}
