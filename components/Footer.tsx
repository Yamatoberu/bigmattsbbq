import { PICKUP_OPTIONS } from "../lib/config";

export function Footer() {
  const nextPickup = PICKUP_OPTIONS[0];

  return (
    <footer className="border-t border-[#cbbda7]">
      <div className="bg-[#2b1a12] px-6 py-3 text-center text-xs uppercase tracking-[0.3em] text-[#f7f1e6] md:px-12">
        Pick Up: {nextPickup.pickupDateLabel} in Utah County
      </div>
      <div className="px-6 py-8 text-xs text-smoke-500 md:px-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Big Matt&apos;s BBQ. Frozen drops, done right.</p>
          <p>Questions? Email bigmattsbarbecue@gmail.com</p>
        </div>
      </div>
    </footer>
  );
}
