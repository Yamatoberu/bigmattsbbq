"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ViewState = "loading" | "success" | "invalid";

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<ViewState>(token ? "loading" : "invalid");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then((response) => {
        if (cancelled) return;
        setState(response.ok ? "success" : "invalid");
      })
      .catch(() => {
        if (cancelled) return;
        setState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-md text-center">
        <div className="glass-card p-8 mt-12">
          {state === "loading" && (
            <p className="text-sm text-smoke-700">Verifying your request…</p>
          )}

          {state === "success" && (
            <>
              <h1
                className="text-4xl font-semibold text-smoke-900"
                style={{ fontFamily: "var(--font-display)" }}
              >
                You&apos;re unsubscribed.
              </h1>
              <p className="text-sm text-smoke-700 mt-4">
                You won&apos;t receive drop notifications from us. You can rejoin anytime from the home page.
              </p>
            </>
          )}

          {state === "invalid" && (
            <>
              <h1
                className="text-4xl font-semibold text-ember-300"
                style={{ fontFamily: "var(--font-display)" }}
              >
                This link has expired.
              </h1>
              <p className="text-sm text-smoke-700 mt-4">
                Unsubscribe links expire after 30 days. If you&apos;d like to unsubscribe, use the link from your most recent email.
              </p>
            </>
          )}
        </div>

        <Link href="/" className="text-sm text-smoke-600 underline mt-6 inline-block">
          Back to Big Matt&apos;s BBQ
        </Link>
      </div>
    </section>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <section className="section-spacing">
          <div className="mx-auto max-w-md text-center">
            <div className="glass-card p-8 mt-12">
              <p className="text-sm text-smoke-700">Verifying your request…</p>
            </div>
          </div>
        </section>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
