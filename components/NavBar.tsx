"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./cart/CartContext";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Frozen Drops", href: "/#order" },
  { label: "Catering", href: "/catering" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" }
] as const;

export function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const { items } = useCart();
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const pathname = usePathname();

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    if (base === "/") return pathname === "/";
    return pathname === base || pathname.startsWith(base + "/");
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#2b2b2f] bg-[#17181c]/85 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3 md:px-12">
          {/* Logo (kept as-is) */}
          <Link href="/" className="flex items-center gap-3 text-[#f7f1e6]">
            <span className="relative h-[125px] w-[125px] overflow-hidden rounded-2xl border border-[#2f3036] bg-[#1b1c22] logo-glow">
              <Image src="/logo.png" alt="Big Matt's BBQ logo" fill sizes="125px" className="object-cover" />
            </span>
          </Link>

          {/* Desktop centered nav (md and up) */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "text-sm font-semibold uppercase tracking-[0.25em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 " +
                  (isActive(link.href) ? "text-[#f0c16a]" : "text-smoke-800 hover:text-[#f0c16a]")
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster: Order Now + Cart on desktop; Hamburger + Cart on mobile */}
          <div className="flex items-center gap-3">
            <Link href="/#order" className="hidden md:inline-flex button-primary px-4 py-2 text-[0.65rem] uppercase tracking-[0.25em]">
              Order Now
            </Link>
            <Link
              href="/checkout"
              className="relative inline-flex items-center justify-center rounded-md border border-[#4a3222] bg-[#1c130f] px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-smoke-900 shadow-none transition hover:border-[#b8893a] hover:text-[#f0c16a]"
              aria-label={`Cart with ${itemCount} items`}
            >
              Cart
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#b31414] px-1 text-[0.6rem] font-semibold text-white shadow">
                  {itemCount}
                </span>
              )}
            </Link>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border border-[#4a3222] bg-[#1c130f] text-smoke-900 hover:text-[#f0c16a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
            >
              {/* Inline SVG — no icon library per UI-SPEC */}
              {isOpen ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Overlay — mobile only, visible when isOpen */}
      <div
        className={
          "md:hidden fixed inset-0 z-30 bg-black/60 transition-opacity duration-200 " +
          (isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer — mobile only, slides in from left */}
      <aside
        id="mobile-nav-drawer"
        className={
          "md:hidden fixed inset-y-0 left-0 z-40 w-64 h-screen border-r border-[#2b2b2f] bg-[#14100d] transition-transform duration-200 " +
          (isOpen ? "translate-x-0" : "-translate-x-full")
        }
        aria-hidden={!isOpen}
      >
        <nav className="flex flex-col gap-1 p-6 pt-20" aria-label="Mobile primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={
                "block rounded-md px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500 " +
                (isActive(link.href) ? "text-[#f0c16a]" : "text-smoke-800 hover:text-[#f0c16a]")
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
