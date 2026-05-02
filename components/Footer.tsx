"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_EMAIL } from "../lib/config";

type FormState = "idle" | "submitting" | "success" | "error";

export function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");

    try {
      const response = await fetch("/api/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        throw new Error("request failed");
      }
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <footer className="border-t border-[#cbbda7]">
      <div className="px-6 py-8 text-xs text-smoke-800 md:px-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Big Matt&apos;s BBQ. Frozen drops, done right.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {state === "success" ? (
              <p className="text-sm font-semibold text-[#f0c16a]">You&apos;re on the list!</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center" noValidate>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="input-field sm:w-64"
                  aria-label="Email address"
                  disabled={state === "submitting"}
                />
                <button
                  type="submit"
                  className="button-primary px-4 py-2 text-sm"
                  disabled={state === "submitting" || email.length === 0}
                >
                  {state === "submitting" ? "…" : "Join List"}
                </button>
              </form>
            )}
          </div>
          <p>Questions? Email {CONTACT_EMAIL}</p>
        </div>
        {state === "error" && (
          <p className="mt-3 text-sm text-ember-300" role="alert">
            Something went wrong. Try again.
          </p>
        )}
      </div>
    </footer>
  );
}
