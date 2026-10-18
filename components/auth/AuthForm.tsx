"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Mode = "login" | "forgot-password" | "reset-password";

export function AuthForm({ mode, next = "/admin" }: { mode: Mode; next?: string }) {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isReset = mode === "reset-password";
  const needsPassword = mode !== "forgot-password";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    if (isReset && data.get("password") !== data.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password"), next })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      if (result.next) window.location.assign(result.next);
      else setMessage(result.message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Please try again.");
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
      {!isReset && <div>
        <label htmlFor="email" className="mb-2 block font-semibold">Email address</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} className="input-field" />
      </div>}
      {needsPassword && <div>
        <label htmlFor="password" className="mb-2 block font-semibold">{isReset ? "New password" : "Password"}</label>
        <div className="flex gap-2">
          <input id="password" name="password" type={visible ? "text" : "password"} autoComplete={isReset ? "new-password" : "current-password"} required minLength={isReset ? 12 : 1} maxLength={isReset ? 128 : 1024} className="input-field min-w-0" aria-describedby={isReset ? "password-help" : undefined} />
          <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="button-secondary px-3">{visible ? "Hide" : "Show"}</button>
        </div>
        {isReset && <p id="password-help" className="mt-2 text-sm text-smoke-800">Use 12–128 characters. Choose a password you haven’t used before.</p>}
      </div>}
      {isReset && <div>
        <label htmlFor="confirmPassword" className="mb-2 block font-semibold">Confirm new password</label>
        <input id="confirmPassword" name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} className="input-field" />
      </div>}
      {error && <p role="alert" className="rounded-md border border-red-400/60 p-3 text-red-200">{error}</p>}
      {message && <p role="status" className="rounded-md border border-gold-600 p-3 text-smoke-900">{message}</p>}
      <button className="button-primary w-full" disabled={pending} type="submit">{pending ? "Please wait…" : mode === "login" ? "Log in" : isReset ? "Update password" : "Send reset link"}</button>
      {mode === "login" && <p className="text-center"><Link href="/forgot-password" className="text-gold-300 underline underline-offset-4">Forgot password?</Link></p>}
      {mode !== "login" && <p className="text-center"><Link href="/login" className="text-gold-300 underline underline-offset-4">Back to log in</Link></p>}
    </form>
  );
}
