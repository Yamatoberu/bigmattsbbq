import Link from "next/link";

export function ScaFooter() {
  return (
    <footer className="border-t border-[#cbbda7]">
      <div className="px-6 py-8 text-xs text-smoke-800 md:px-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Big Matt&apos;s BBQ. SCA Tracker.</p>
          <p>
            <Link href="https://bigmattsbbq.com" rel="noopener" className="hover:text-gold-300">
              Visit the main site
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
