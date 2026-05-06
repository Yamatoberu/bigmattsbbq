"use client";

import { useState, type FormEvent } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function MailingListSection() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setErrorMessage(undefined);

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
      setErrorMessage("Something went wrong. Try again in a moment.");
    }
  }

  return (
    <section className="section-spacing bg-[#0f0b08]">
      <div className="mx-auto max-w-xl text-center">
        <span className="badge">Drop Notifications</span>
        <h2
          className="mt-6 text-4xl font-semibold text-smoke-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Be first to know about the next drop.
        </h2>
        <p className="mt-4 text-sm text-smoke-700">
          We only email when a new drop opens. No spam, ever.
        </p>

        {state === "success" ? (
          <p className="mt-8 text-sm font-semibold text-gold-300">
            You&apos;re on the list! We&apos;ll let you know about the next drop.
          </p>
        ) : (
          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
            onSubmit={handleSubmit}
            noValidate
          >
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="input-field sm:w-72"
              aria-label="Email address"
              disabled={state === "submitting"}
            />
            <button
              type="submit"
              className="button-primary px-6 py-3 text-sm"
              disabled={state === "submitting" || email.length === 0}
            >
              {state === "submitting" ? "…" : "Notify Me"}
            </button>
          </form>
        )}

        {state === "error" && errorMessage && (
          <p className="mt-3 text-sm text-ember-300" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
