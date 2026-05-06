"use client";

import { useState, type FormEvent } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function SoldOutCapture() {
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
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("request failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <p className="text-xs font-semibold text-gold-300">
        You&apos;re on the list for the next drop.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form className="flex gap-2" onSubmit={handleSubmit} noValidate>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="input-field min-w-0 flex-1 py-2 text-xs"
          aria-label="Email address for drop notifications"
          disabled={state === "submitting"}
        />
        <button
          type="submit"
          className="button-primary shrink-0 px-3 py-2 text-xs"
          disabled={state === "submitting" || email.length === 0}
        >
          {state === "submitting" ? "…" : "Notify Me"}
        </button>
      </form>
      {state === "error" && (
        <p className="text-xs text-ember-300" role="alert">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
