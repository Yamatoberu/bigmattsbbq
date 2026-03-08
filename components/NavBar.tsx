"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart/CartContext";

export function NavBar() {
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-30 border-b border-[#2b2b2f] bg-[#17181c]/85 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3 md:px-12">
        <Link href="/" className="flex items-center gap-3 text-[#f7f1e6]">
          <span className="relative h-[125px] w-[125px] overflow-hidden rounded-2xl border border-[#2f3036] bg-[#1b1c22] logo-glow">
            <Image src="/logo.png" alt="Big Matt's BBQ logo" fill sizes="125px" className="object-cover" />
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/#order" className="button-primary px-4 py-2 text-[0.65rem] uppercase tracking-[0.25em]">
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
        </div>
      </div>
    </header>
  );
}
