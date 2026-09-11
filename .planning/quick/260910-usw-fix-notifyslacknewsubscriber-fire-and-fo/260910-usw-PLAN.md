---
phase: quick-260910-usw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/mailingListSlack.test.ts
  - tests/mailingList.test.ts
  - app/api/mailing-list/route.ts
autonomous: false
requirements: [ISSUE-15-FIX]
user_setup: []

must_haves:
  truths:
    - "A production signup on Vercel posts exactly one message to the Slack #email channel"
    - "Vercel runtime logs show no 'Slack subscriber notification failed / ECONNRESET hooks.slack.com' entries after a signup"
    - "The HTTP response to the signup form is still returned immediately, not delayed by the Slack round-trip"
    - "A Slack outage still yields a 200 signup response with no unhandled rejection"
    - "notifySlackNewOrder in the checkout route is byte-for-byte unchanged"
  artifacts:
    - path: "app/api/mailing-list/route.ts"
      provides: "Slack notification deferred via Next.js after() so the serverless function stays alive until the fetch settles"
      contains: "after"
    - path: "tests/mailingListSlack.test.ts"
      provides: "Regression test proving the Slack fetch is deferred, not inline"
      contains: "flushAfter"
    - path: "tests/mailingList.test.ts"
      provides: "next/server partial mock so success-path tests survive the after() call"
      contains: "afterQueue"
  key_links:
    - from: "app/api/mailing-list/route.ts"
      to: "next/server after()"
      via: "import { after } from next/server"
      pattern: "import \\{[^}]*after[^}]*\\} from \"next/server\""
    - from: "app/api/mailing-list/route.ts POST"
      to: "notifySlackNewSubscriber"
      via: "after callback registration on the success path only"
      pattern: "after\\(\\(\\) => notifySlackNewSubscriber"
---

<objective>
Fix the fire-and-forget Slack notification in `app/api/mailing-list/route.ts` that works locally but fails in Vercel production with `ECONNRESET` to `hooks.slack.com`.

Purpose: Vercel freezes the serverless function the moment the HTTP response is flushed. The unawaited `fetch()` to the Slack webhook is still mid-TLS-handshake at that point, so the socket is killed and the notification never arrives. The failure surfaces in the logs of a *later, unrelated* request (e.g. `GET /api/drop`) when the frozen instance is thawed. It works under `next dev` only because the long-lived Node dev process keeps the socket alive after the response returns.

Output: The Slack fetch is registered with Next.js `after()`, which keeps the invocation alive until the promise settles while still flushing the response immediately. Plus a regression test that fails if the notification ever goes back to being called inline.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@app/api/mailing-list/route.ts
@tests/mailingListSlack.test.ts
@tests/mailingList.test.ts

<research_findings>
All four of these were verified empirically in this repo during planning. Do not re-litigate them; build on them.

1. `@vercel/functions` is NOT a dependency of this project (confirmed against `package.json` and `node_modules`).
2. `next/server` does NOT export `waitUntil` (`typeof require("next/server").waitUntil === "undefined"`). It DOES export `after` as a stable API on the installed Next.js `16.1.6` (`node_modules/next/server.d.ts` line 21: `export { after } from 'next/dist/server/after'`).
3. **Decision: use `after()` from `next/server`. Do NOT add `@vercel/functions`.** `after()` is the Next.js-native, framework-sanctioned form of the same primitive — on Vercel it is implemented on top of the platform `waitUntil`. It solves the exact bug with zero new dependencies, zero supply-chain surface, and no import-path risk. Adding a package to reach the same behavior would be strictly worse.
4. **`after()` THROWS outside a request scope.** Verified: calling it from a plain Vitest test raises ``` `after` was called outside a request scope ```. The route handler's `POST` is imported and invoked directly by Vitest with a plain `Request`, so there is no request scope in tests. An unguarded `after()` inside the route's `try` block would be swallowed by the outer `catch` and turn every successful test signup into a 500. **Both** mailing-list test files therefore need a partial mock of `next/server` — this is why Task 1 exists and must land before Task 2.
5. The partial-mock pattern in Task 1 was prototyped and confirmed working in this repo: `NextResponse` stays fully functional via `importOriginal`, and a `vi.hoisted` queue survives the `vi.resetModules()` that both test files call in `beforeEach`.
</research_findings>

<interfaces>
Current shape of the code being changed, `app/api/mailing-list/route.ts`:

- `escapeSlackText(value: string): string` — module-scoped, unexported.
- `notifySlackNewSubscriber({ email, firstName, signedUpAt }: { email: string; firstName: string; signedUpAt: string }): void` — module-scoped, unexported, non-async. Reads `process.env.SLACK_EMAIL_WEBHOOK_URL`, early-returns when unset, builds the message, then issues an unawaited `fetch(...).catch(...)`. **This is the bug.**
- `POST(request: Request)` — single top-level try/catch. Calls `notifySlackNewSubscriber` only after a successful `resend.contacts.create()`, strictly after the 400 / env-500 / Resend-500 returns, immediately before `return NextResponse.json({ ok: true }, { status: 200 })`.

Baseline: 312 tests pass across 32 files. `tests/mailingListSlack.test.ts` has 8 cases; `tests/mailingList.test.ts` has 9 cases, three of which assert a 200 on the success path.

OUT OF SCOPE — do not open, do not edit, do not "make consistent":
- `app/api/checkout/route.ts` (`notifySlackNewOrder` at line 46, called at line 524). It is confirmed working in production and is explicitly frozen by the task owner.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add the next/server after() test harness and two failing regression tests</name>
  <files>tests/mailingListSlack.test.ts, tests/mailingList.test.ts</files>
  <behavior>
    Two NEW cases in tests/mailingListSlack.test.ts, both of which MUST FAIL against the current inline-fetch implementation (this is the RED step):
    - Test 9 "the Slack fetch is deferred, not issued inline": on a successful signup, after `await POST(req)` resolves, `globalThis.fetch` has NOT been called; after `await flushAfter()`, it has been called exactly once with the webhook URL. Fails today because the current code calls fetch inline.
    - Test 10 "a successful signup registers exactly one after() callback, failure paths register none": success path leaves `afterQueue.length === 1`; the 400 path, the Resend-error 500 path, and the missing-env 500 path each leave `afterQueue.length === 0`. Fails today because the current code registers zero callbacks on the success path.
    The 8 existing Slack cases and the 9 existing cases in tests/mailingList.test.ts must still pass, both before and after Task 2.
  </behavior>
  <action>
    In BOTH tests/mailingListSlack.test.ts and tests/mailingList.test.ts, add an identical inline harness at the top of the file, below the existing vitest import. Duplicate it in each file rather than extracting a shared helper module — a shared module's state would be torn out from under the test file by the `vi.resetModules()` that both files already call in `beforeEach`, and `vi.mock` factories are hoisted per-module anyway.

    The harness: declare `const afterQueue = vi.hoisted(() => [] as Array&lt;() =&gt; unknown&gt;);` then `vi.mock("next/server", ...)` with an async factory that takes `importOriginal`, awaits `importOriginal&lt;typeof import("next/server")&gt;()`, and returns the spread of the original with `after` replaced by a function that pushes its callback onto `afterQueue` and returns undefined. Spreading the original is what keeps `NextResponse` functional — verified working in this repo. Then declare a module-scoped `async function flushAfter()` that splices the whole queue and awaits each callback in order.

    In each file's existing `beforeEach`, add `afterQueue.length = 0;` so queued callbacks never leak between cases.

    In tests/mailingListSlack.test.ts, update the existing cases that assert the Slack fetch DID happen — Test 1, Test 2, Test 7, Test 8 — to `await flushAfter();` before their fetch/message assertions. The existing `getSlackMessageText()` helper stays exactly as-is; only the point at which it is called moves. Leave Tests 3, 4, 5, 6 (the "never calls fetch" cases) asserting exactly what they assert today — those hold under both implementations. Note that these four updated cases pass against the current implementation too (`flushAfter` on an empty queue is a no-op and fetch was already called inline); they are compatibility edits, not the regression guard. Tests 9 and 10 are the regression guard.

    Then append Test 9 and Test 10 as described in the behavior block, following the file's existing case style: `mockResend(...)`, `vi.resetModules()`-safe dynamic `await import("../app/api/mailing-list/route")`, a plain `new Request("http://localhost/api/mailing-list", ...)`.

    tests/mailingList.test.ts needs ONLY the harness plus the `afterQueue.length = 0` line — no case changes. It gets the harness because after Task 2 its three success-path 200 assertions would otherwise hit the real `after()`, which throws outside a request scope, get swallowed by the route's outer catch, and return 500.

    Do not touch tests/broadcast.test.ts or any other test file.
  </action>
  <verify>
    <automated>cd /Users/matt/Development/BigMattsBbq &amp;&amp; npx vitest run tests/mailingListSlack.test.ts tests/mailingList.test.ts 2>&amp;1 | tail -20</automated>
  </verify>
  <done>Exactly two cases fail (Test 9 and Test 10), both on the assertion that the fetch/callback is deferred; all other cases in both files pass. This is the expected RED state — do not implement the fix inside this task.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Defer the Slack notification with after() so Vercel keeps the function alive</name>
  <files>app/api/mailing-list/route.ts</files>
  <behavior>
    All 10 cases in tests/mailingListSlack.test.ts and all 9 in tests/mailingList.test.ts pass, including the two that were RED after Task 1. Full suite reaches 314 passing.
  </behavior>
  <action>
    Change the `next/server` import to bring in `after` alongside `NextResponse`.

    Convert `notifySlackNewSubscriber` from a `void`-returning non-async function into an `async` function returning `Promise&lt;void&gt;`, keeping the same name, the same destructured parameter object, and the same module-scoped unexported placement. Keep the `process.env.SLACK_EMAIL_WEBHOOK_URL` lookup and the early return when it is unset inside the function — do not hoist that check into `POST`. Keep the message array and `escapeSlackText` calls byte-for-byte as they are.

    Replace the trailing unawaited `fetch(...).catch(...)` with an awaited `fetch` wrapped in try/catch: `await` the fetch, and if the response is not `ok`, `console.warn("Slack subscriber notification failed", res.status)`; in the catch, `console.warn("Slack subscriber notification failed", err)` — preserving the existing log prefix string so the Vercel log search the user already knows keeps working. The function must never throw; a Slack outage is not a signup failure.

    In `POST`, replace the bare `notifySlackNewSubscriber({...})` call with `after(() => notifySlackNewSubscriber({...}))`, passing the identical argument object (`parsed.data.email`, `parsed.data.firstName`, `new Date().toISOString()`). Keep it in its current position: inside the try block, after the successful `resend.contacts.create()` and its error return, immediately before the 200 return. Pass a callback (not a bare promise) so the fetch is not even initiated until the response has been flushed.

    Do not add a try/catch around the `after()` call. A route handler always has a request scope in the real Next.js runtime; swallowing a scope error there would silently restore the exact bug this plan fixes, and the mocked tests cover the Vitest case.

    No comments in the production file beyond what the project already does (none) — per CLAUDE.md the codebase carries no inline explanatory comments. The WHY lives in this plan and the SUMMARY.

    Do not open or modify app/api/checkout/route.ts.
  </action>
  <verify>
    <automated>cd /Users/matt/Development/BigMattsBbq &amp;&amp; npx tsc --noEmit &amp;&amp; npm test 2>&amp;1 | tail -8 &amp;&amp; npm run build 2>&amp;1 | tail -15 &amp;&amp; git diff --name-only | sort</automated>
  </verify>
  <done>`npx tsc --noEmit` is clean, `npm test` reports 314 passed (312 baseline + 2 new), `npm run build` succeeds, and `git diff --name-only` lists exactly three files: app/api/mailing-list/route.ts, tests/mailingList.test.ts, tests/mailingListSlack.test.ts. Do NOT gate on `npm run lint` — `next lint` is broken repo-wide on Next 16.1.6 with no ESLint config (a known deferred item in STATE.md), unrelated to this change.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    The mailing-list Slack notification now runs inside a Next.js `after()` callback, so Vercel keeps the serverless invocation alive until the POST to `hooks.slack.com` settles instead of freezing the function mid-TLS-handshake. `notifySlackNewOrder` in the checkout route was not touched. No new npm dependency was added.
  </what-built>
  <how-to-verify>
    This bug only reproduces on Vercel's serverless runtime — local `npm run dev` passes both before and after the fix, so localhost proves nothing here. Production verification is the only real proof.

    1. Deploy to Vercel (push to `master`, or `npx vercel --prod`). Wait for the deployment to be ready.
    2. Open the production site and submit the mailing-list signup form with a first name and a real address you control (a `+tag` alias on your own inbox is fine).
    3. Confirm the form returns its success state immediately — no perceptible extra delay versus before. A visibly slower submit would mean the Slack call became blocking, which is wrong.
    4. Check the Slack `#email` channel: exactly ONE new subscriber message, correctly formatted with name, email, and the ISO signup timestamp.
    5. Open the Vercel runtime logs for the deployment. Confirm there is NO `Slack subscriber notification failed` / `TypeError: fetch failed` / `ECONNRESET` / `hooks.slack.com` entry — neither on the `POST /api/mailing-list` request nor on any later unrelated request (the old symptom surfaced on requests such as `GET /api/drop`). Browse the site a little after the signup to force a few more invocations, then re-check the logs.
    6. Confirm checkout is unaffected: place a test order and confirm the existing order notification still lands in its Slack channel exactly as before.
  </how-to-verify>
  <resume-signal>Type "approved" once the Slack #email message arrived with no ECONNRESET in the Vercel logs, or paste the failing log lines.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → POST /api/mailing-list | Untrusted `email` / `firstName` cross here; Zod-validated at route entry (unchanged by this plan) |
| route → hooks.slack.com | Outbound secret-bearing request; webhook URL is a bearer-equivalent credential in `SLACK_EMAIL_WEBHOOK_URL` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-usw-01 | Tampering | Slack message body via `firstName` | mitigate | `escapeSlackText()` is preserved unchanged; Test 8 (`<!channel>` escaping) still asserts it after the `after()` move |
| T-usw-02 | Information disclosure | `SLACK_EMAIL_WEBHOOK_URL` in logs | mitigate | `console.warn` logs only the error object or HTTP status, never the webhook URL; the URL is read from `process.env` and never echoed |
| T-usw-03 | Denial of service | Signup blocked by a Slack outage | mitigate | The fetch runs in an `after()` callback outside the response path and is wrapped in try/catch; Test 7 asserts a rejecting fetch still yields 200 |
| T-usw-04 | Denial of service | `after()` throwing outside request scope turns signups into 500s | mitigate | Verified `after()` throws outside request scope; both test files partially mock `next/server` (Task 1), and the real runtime always provides a request scope inside a route handler. Task 2's production build + Task 3's live signup are the gates |
| T-usw-SC | Tampering | npm supply chain | accept | No package is installed. `after()` ships with the already-vendored Next.js 16.1.6; `@vercel/functions` is deliberately NOT added, so there is no new dependency surface to audit |
</threat_model>

<verification>
- `npx tsc --noEmit` clean
- `npm test` — 314 passed (baseline 312 + Test 9 + Test 10)
- `npm run build` succeeds
- `grep -n 'from "next/server"' app/api/mailing-list/route.ts` shows `after` imported alongside `NextResponse`
- `git diff --stat -- app/api/checkout/route.ts` is empty (checkout untouched)
- `git diff -- package.json package-lock.json` is empty (no dependency added)
- Task 3 human production verification approved
</verification>

<success_criteria>
- A real production signup on Vercel posts exactly one message to Slack `#email`
- Vercel runtime logs contain no `ECONNRESET` / `hooks.slack.com` failure after a signup, on that request or any subsequent one
- The signup form's response time is unchanged (the Slack round-trip never blocks the response)
- A Slack outage still returns 200 with no unhandled rejection
- `app/api/checkout/route.ts` and `package.json` are byte-for-byte unchanged
- Exactly three files changed: the mailing-list route and the two mailing-list test files
</success_criteria>

<output>
Create `.planning/quick/260910-usw-fix-notifyslacknewsubscriber-fire-and-fo/260910-usw-SUMMARY.md` when done.

Record in the summary: the decision to use `next/server`'s `after()` instead of adding `@vercel/functions` (and that `next/server` does not export `waitUntil` on 16.1.6), and the finding that `after()` throws outside a request scope — which is why both mailing-list test files carry a `next/server` partial mock.
</output>
