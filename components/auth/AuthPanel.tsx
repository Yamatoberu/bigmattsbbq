import Link from "next/link";
import type { ReactNode } from "react";

export function AuthPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="mx-auto w-full max-w-lg font-[family-name:var(--font-body)] px-5 py-12 sm:py-20">
    <section className="glass-card p-6 sm:p-9">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold-300">Big Matt’s BBQ</p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-smoke-900">{title}</h1>
      <p className="mb-7 mt-3 text-smoke-800">{description}</p>
      {children}
    </section>
    <p className="mt-7 text-center"><Link href="/" className="text-gold-300 underline underline-offset-4">Back to the website</Link></p>
  </main>;
}
