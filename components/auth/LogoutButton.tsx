"use client";

import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function logout() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      // A full navigation discards cached protected content after cookie removal.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch { setError(true); setPending(false); }
  }
  return <span className="inline-flex flex-col gap-1">
    <button type="button" className="button-secondary" disabled={pending} onClick={logout}>{pending ? "Logging out…" : "Log out"}</button>
    {error && <span role="alert" className="text-sm text-red-200">Could not log out. Try again.</span>}
  </span>;
}
