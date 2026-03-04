import Image from "next/image";
import Link from "next/link";

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#2b2b2f] bg-[#17181c]/85 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3 md:px-12">
        <Link href="/" className="flex items-center gap-3 text-[#f7f1e6]">
          <span className="relative h-[125px] w-[125px] overflow-hidden rounded-2xl border border-[#2f3036] bg-[#1b1c22] logo-glow">
            <Image src="/logo.png" alt="Big Matt's BBQ logo" fill sizes="125px" className="object-cover" />
          </span>
        </Link>
        <Link href="/#order" className="button-primary px-4 py-2 text-[0.65rem] uppercase tracking-[0.25em]">
          Order Now
        </Link>
      </div>
    </header>
  );
}
