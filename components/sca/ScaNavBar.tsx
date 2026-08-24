"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const scaNavLinks = [
  { label: "Dashboard", href: "/sca" },
  { label: "Competitions", href: "/sca/competitions" },
  { label: "Cooks", href: "/sca/cooks" }
] as const;

export function ScaNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/sca") return pathname === "/" || pathname === "/sca";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#2b2b2f] bg-[#17181c]/85 backdrop-blur">
      <div className="flex flex-row items-center gap-6 px-6 py-3 md:px-12">
        <Link
          href="https://bigmattsbbq.com"
          rel="noopener"
          className="shrink-0 flex items-center gap-3 text-[#f7f1e6]"
        >
          <span className="relative h-[56px] w-[56px] overflow-hidden rounded-lg border border-[#2f3036] bg-[#1b1c22] logo-glow">
            <Image src="/logo.png" alt="Big Matt's BBQ logo" fill sizes="56px" loading="eager" className="object-cover" />
          </span>
          <span className="font-[var(--font-display)] text-lg text-[#f7f1e6]">SCA Tracker</span>
        </Link>

        <nav
          className="flex flex-row items-center gap-8"
          aria-label="SCA Tracker"
        >
          {scaNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                "text-[1.092rem] font-semibold uppercase tracking-[0.25em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 " +
                (isActive(link.href) ? "text-gold-300" : "text-smoke-800 hover:text-gold-300")
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
