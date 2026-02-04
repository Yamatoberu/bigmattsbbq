import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-slate-400 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="font-semibold text-slate-100">Big Matt&apos;s BBQ</p>
          <p>Cache Valley &amp; Utah County | Payment at pickup</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link className="hover:text-ember" href="/frozen-drops">
            Frozen Drops
          </Link>
          <Link className="hover:text-ember" href="/catering">
            Catering
          </Link>
          <Link className="hover:text-ember" href="/about">
            About
          </Link>
          <Link className="hover:text-ember" href="/contact">
            Contact
          </Link>
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Big Matt&apos;s BBQ</p>
      </div>
    </footer>
  );
}
