import { CONTACT_EMAIL } from "../lib/config";

export function Footer() {
  return (
    <footer className="border-t border-[#cbbda7]">
      <div className="px-6 py-8 text-xs text-smoke-800 md:px-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Big Matt&apos;s BBQ. Frozen drops, done right.</p>
          <p>Questions? Email {CONTACT_EMAIL}</p>
        </div>
      </div>
    </footer>
  );
}
