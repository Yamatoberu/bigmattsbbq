'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { href: '/catering', label: 'Catering' },
  { href: '/frozen-drops', label: 'Frozen Drops' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' }
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/25 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 md:px-8">
        <div className="flex flex-1 justify-start md:justify-start">
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/logo.jpg"
              alt="Big Matt's BBQ"
              width={112}
              height={112}
              className="h-28 w-28 rounded-2xl border border-ember/50 bg-black object-cover shadow-glow"
              priority
            />
          </Link>
        </div>

        <div className="flex flex-1 justify-center md:hidden">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Big Matt&apos;s BBQ
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end md:hidden">
          <button
            type="button"
            className="rounded-full border border-white/10 p-2 hover:border-ember/50 hover:text-ember"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <div className="space-y-1">
              <span className="block h-0.5 w-6 bg-current" />
              <span className="block h-0.5 w-6 bg-current" />
              <span className="block h-0.5 w-6 bg-current" />
            </div>
          </button>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'transition-colors',
                isActive(item.href) ? 'text-ember' : 'text-slate-200 hover:text-ember'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/frozen-drops"
            className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-black shadow-glow hover:translate-y-[-1px] transition"
          >
            Order Frozen BBQ
          </Link>
        </nav>
      </div>

      <div
        className={clsx(
          'md:hidden',
          open ? 'max-h-screen border-t border-white/10 bg-black/80 backdrop-blur' : 'max-h-0 overflow-hidden'
        )}
      >
        <div className="flex flex-col gap-4 px-5 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={clsx(
                'rounded-lg px-3 py-2 text-base font-medium transition-colors',
                isActive(item.href) ? 'bg-ember/10 text-ember' : 'text-slate-200 hover:text-ember'
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/frozen-drops"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-ember px-4 py-3 text-center text-base font-semibold text-black shadow-glow"
          >
            Order Frozen BBQ
          </Link>
        </div>
      </div>
    </header>
  );
}
