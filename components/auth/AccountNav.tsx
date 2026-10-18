"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

export function AccountNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [access, setAccess] = useState<{ signedIn: boolean; admin: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        setAccess(await response.json());
      } catch { if (!controller.signal.aborted) setAccess(null); }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [pathname]);
  return <div className="flex flex-wrap items-center gap-3">
    {access?.admin && <Link onClick={onNavigate} href="/admin" prefetch={false} className="text-gold-300 underline underline-offset-4">Admin</Link>}
    {access?.signedIn ? <LogoutButton /> : <Link onClick={onNavigate} href="/login" prefetch={false} className="button-secondary">Log in</Link>}
  </div>;
}
