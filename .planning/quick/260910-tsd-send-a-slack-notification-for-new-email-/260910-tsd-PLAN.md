---
phase: quick-260910-tsd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/mailing-list/route.ts
  - tests/mailingListSlack.test.ts
  - .env.example
autonomous: false
requirements: [ISSUE-15]

user_setup:
  - service: slack
    why: "Incoming Webhooks are bound to a single channel at creation time, so the existing SLACK_ORDERS_WEBHOOK_URL cannot post to #email. A new channel and a new webhook must be created by a human in the Slack UI."
    env_vars:
      - name: SLACK_EMAIL_WEBHOOK_URL
        source: "api.slack.com/apps -> (existing Big Matt's BBQ app) -> Incoming Webhooks -> Add New Webhook to Workspace -> select #email"
    dashboard_config:
      - task: "Create the #email Slack channel"
        location: "Slack workspace -> Create channel -> name it 'email'"
      - task: "Add a new Incoming Webhook bound to #email and copy the URL"
        location: "api.slack.com/apps -> Incoming Webhooks"
      - task: "Set SLACK_EMAIL_WEBHOOK_URL in .env.local and in Vercel project environment variables"
        location: "Local .env.local + Vercel dashboard -> Settings -> Environment Variables"

must_haves:
  truths:
    - "A successful email signup posts exactly one message to the #email Slack channel"
    - "The message clearly identifies itself as a new email subscriber event"
    - "The message contains the subscriber's email address, first name, and a signup timestamp"
    - "A 400 (validation failure) signup attempt posts nothing to Slack"
    - "A 500 (Resend failure or missing env) signup attempt posts nothing to Slack"
    - "A Slack outage, rejected fetch, or unset webhook URL still returns 200 to the customer"
  artifacts:
    - path: "app/api/mailing-list/route.ts"
      provides: "notifySlackNewSubscriber() + local escapeSlackText(), called only on the success path"
      contains: "notifySlackNewSubscriber"
    - path: "tests/mailingListSlack.test.ts"
      provides: "Vitest coverage for message content, path gating, and failure isolation"
    - path: ".env.example"
      provides: "SLACK_EMAIL_WEBHOOK_URL documented alongside SLACK_ORDERS_WEBHOOK_URL"
      contains: "SLACK_EMAIL_WEBHOOK_URL"
  key_links:
    - from: "app/api/mailing-list/route.ts POST success branch"
      to: "notifySlackNewSubscriber"
      via: "direct call immediately before the 200 response, after the `if (error)` guard"
      pattern: "notifySlackNewSubscriber\\("
    - from: "notifySlackNewSubscriber"
      to: "process.env.SLACK_EMAIL_WEBHOOK_URL"
      via: "direct process.env read with early return when unset"
      pattern: "process\\.env\\.SLACK_EMAIL_WEBHOOK_URL"
---

<objective>
Post a Slack notification to a new `#email` channel every time someone successfully signs up for email notifications, mirroring the existing order-notification pattern exactly.

Purpose: GitHub issue #15 — the team wants visibility into mailing-list growth in Slack, the same way they already get order visibility.
Output: A `notifySlackNewSubscriber()` function in the mailing-list route, a documented `SLACK_EMAIL_WEBHOOK_URL` env var, and Vitest coverage proving the notification fires on success only and can never break the customer's signup.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@app/api/mailing-list/route.ts
@app/api/checkout/route.ts
@tests/mailingList.test.ts
@tests/checkoutSlack.test.ts
@.env.example

<interfaces>
<!-- Extracted from the codebase. Do NOT re-explore to find these. -->

`escapeSlackText` in `app/api/checkout/route.ts` is declared at module scope and is
**NOT exported** (verified: `function escapeSlackText(value: string): string` on line 27,
no `export` keyword). It therefore cannot be imported. Per the locked decision, duplicate
the identical three-replace logic locally in the mailing-list route rather than extracting
a shared `lib/slack.ts` — there are only two call sites and the project convention is to
avoid premature abstraction.

The existing pattern to mirror (`notifySlackNewOrder`, `app/api/checkout/route.ts:46-98`):
- module-scoped, non-exported, returns `void` (not `Promise<void>`)
- single destructured object parameter with an inline object type annotation
- reads its webhook URL directly via `process.env.*`, `if (!webhookUrl) return;`
- builds a plain-text message as a `[...]` array `.join("\n")`
- `fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: message }) }).catch((err) => { console.warn("...", err); });`
- the `fetch` is never `await`ed and its rejection is swallowed by `.catch`

Current mailing-list route success path (`app/api/mailing-list/route.ts:40-55`):
```
const { error } = await resend.contacts.create({ audienceId, email, firstName, unsubscribed: false });
if (error) { logError(...); return NextResponse.json({ error: ... }, { status: 500 }); }
return NextResponse.json({ ok: true }, { status: 200 });
```
`parsed.data.email` is already trimmed + lowercased by Zod; `parsed.data.firstName` is already trimmed.
Resend's `contacts.create` response is destructured for `error` only — there is no persisted
`signedUpAt` to read back, so the timestamp is generated at call time.

Existing test-file conventions:
- `tests/mailingList.test.ts` uses `vi.resetModules()` + `vi.doMock("resend", ...)` +
  `vi.doMock("server-only", ...)` in a `mockResend(result)` helper, then
  `await import("../app/api/mailing-list/route")`. It uses a real `Request` and real
  `NextResponse` (it does NOT mock `next/server`), so assertions use `await res.json()`.
- `tests/checkoutSlack.test.ts` stubs `globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })`
  in `beforeEach`, restores `globalThis.fetch = originalFetch` in `afterEach`, and sets/deletes
  the webhook env var in the same hooks.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add notifySlackNewSubscriber to the mailing-list route with test coverage</name>
  <files>tests/mailingListSlack.test.ts, app/api/mailing-list/route.ts, .env.example</files>
  <behavior>
    Write `tests/mailingListSlack.test.ts` FIRST and confirm it fails before touching the route.
    Model its module-mocking setup on `tests/mailingList.test.ts` (`vi.resetModules()` +
    `vi.doMock("resend", ...)` + `vi.doMock("server-only", ...)`, then dynamic
    `await import("../app/api/mailing-list/route")`) and its fetch/env stubbing on
    `tests/checkoutSlack.test.ts`. In `beforeEach` set
    `process.env.SLACK_EMAIL_WEBHOOK_URL = "https://hooks.slack.test/T000/B111/email"` and stub
    `globalThis.fetch`; in `afterEach` restore the original `fetch` and `delete` the env var so
    nothing leaks into `tests/mailingList.test.ts`.

    - Test 1: a successful signup calls `fetch` exactly once with the `SLACK_EMAIL_WEBHOOK_URL`,
      method POST, and a JSON body whose `text` contains "New Email Subscriber", the submitted
      email, and the submitted first name.
    - Test 2: the message contains an ISO-8601 timestamp line — assert the `text` matches
      `/Signed up: \d{4}-\d{2}-\d{2}T[\d:.]+Z/`.
    - Test 3: an invalid email (400 path) returns 400 and `fetch` is never called.
    - Test 4: Resend returning `{ data: null, error: {...} }` (500 path) returns 500 and `fetch`
      is never called.
    - Test 5: missing `RESEND_AUDIENCE_ID` (the early 500 env path) returns 500 and `fetch` is
      never called.
    - Test 6: with `SLACK_EMAIL_WEBHOOK_URL` deleted, a successful signup still returns 200 and
      `fetch` is never called.
    - Test 7: `globalThis.fetch` rejecting with `new Error("network down")` still yields a 200
      response with `{ ok: true }` and produces no unhandled rejection.
    - Test 8: a `firstName` of `"<!channel> Matt"` is escaped — the `text` must NOT contain
      `"<!channel>"` and MUST contain `"&lt;!channel&gt; Matt"`.
  </behavior>
  <action>
    After the tests are written and failing, implement in `app/api/mailing-list/route.ts`:

    1. Add a module-scoped, non-exported `escapeSlackText(value: string): string` that is a
       character-for-character duplicate of the one in `app/api/checkout/route.ts` (three chained
       `.replace()` calls for `&`, `<`, `>`, in that order — `&` MUST be replaced first or the
       entity ampersands get double-escaped). Do NOT import it from the checkout route and do NOT
       create a shared `lib/slack.ts`; it is not exported there and the two-call-site rule in
       CLAUDE.md says no premature abstraction.
    2. Add a module-scoped, non-exported `notifySlackNewSubscriber({ email, firstName, signedUpAt }: { email: string; firstName: string; signedUpAt: string }): void`
       placed directly below `escapeSlackText`, above `export async function POST`. It reads
       `process.env.SLACK_EMAIL_WEBHOOK_URL`, returns immediately when falsy, builds the message
       with a `[...].join("\n")` array, and issues the same fire-and-forget
       `fetch(...).catch((err) => { console.warn("Slack subscriber notification failed", err); })`.
       Declare the return type as `void`, not `Promise<void>`, and do not mark it `async` — this is
       what structurally guarantees it can never be awaited by a future edit.
    3. Message body, mirroring the "New Order — Big Matt's BBQ" header style (em dash, not hyphen):
       line 1 `New Email Subscriber — Big Matt's BBQ`, line 2 empty, then
       `Name: ${escapeSlackText(firstName)}`, `Email: ${escapeSlackText(email)}`,
       `Signed up: ${signedUpAt}`. Escape both `firstName` and `email` even though Zod's `.email()`
       already narrows the email charset — consistency with the checkout route matters more than
       the marginal saving.
    4. Call it from exactly one place: immediately after the `if (error) { ... return 500 }` guard
       and immediately before `return NextResponse.json({ ok: true }, { status: 200 })`, as
       `notifySlackNewSubscriber({ email: parsed.data.email, firstName: parsed.data.firstName, signedUpAt: new Date().toISOString() })`.
       It must sit inside the `POST` try block but strictly after every failure return, so the 400
       validation branch, the `getResendEnv()` 500 branch, the Resend-error 500 branch, and the
       outer `catch` can none of them reach it.
    5. In `.env.example`, extend the existing `# Slack notifications` block (do not start a new
       section) with a comment block in the same two-line style as `SLACK_ORDERS_WEBHOOK_URL`,
       followed by `SLACK_EMAIL_WEBHOOK_URL=`. The comment must state that it is the Incoming
       Webhook for the `#email` channel, that it is optional (notifications silently skipped when
       unset), and that it must be a separate webhook from the orders one because Slack binds each
       Incoming Webhook to a single channel at creation time.

    Do not modify the Zod schema, the Resend call, the response shapes, `lib/env.ts`, or either
    signup form component. No `getSlackEnv()` helper — the direct `process.env` read is the
    established convention for Slack webhooks in this codebase.
  </action>
  <verify>
    <automated>npx vitest run tests/mailingListSlack.test.ts tests/mailingList.test.ts tests/checkoutSlack.test.ts && npm run test && npx tsc --noEmit && npm run build && grep -q 'SLACK_EMAIL_WEBHOOK_URL' .env.example && test "$(grep -v '^\s*[/*#]' app/api/mailing-list/route.ts | grep -c 'notifySlackNewSubscriber')" -eq 2</automated>
  </verify>
  <done>
    All 8 new tests pass; the pre-existing `tests/mailingList.test.ts` and
    `tests/checkoutSlack.test.ts` suites pass unchanged; the full Vitest suite is green;
    `npx tsc --noEmit` is clean; `npm run build` succeeds; `SLACK_EMAIL_WEBHOOK_URL` is documented
    in `.env.example`; and `notifySlackNewSubscriber` appears exactly twice in non-comment route
    source (one declaration, one call site). Note: `npm run lint` is a known pre-existing repo-wide
    failure on Next.js 16.1.6 with no ESLint config (logged as deferred tech debt in STATE.md) —
    do NOT attempt to fix it and do NOT treat it as a regression from this change.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Human verification — create #email channel, wire webhook, confirm live notification</name>
  <what-built>
    `app/api/mailing-list/route.ts` now fires a fire-and-forget Slack notification on every
    successful email signup, reading `SLACK_EMAIL_WEBHOOK_URL` from the environment and silently
    skipping when it is unset. Eight automated tests prove the message content, that failed signups
    send nothing, and that a Slack outage cannot break the customer's signup.

    Everything that can be automated has been. The remaining steps require the Slack UI, which has
    no CLI or API path for creating a channel-bound Incoming Webhook.
  </what-built>
  <how-to-verify>
    1. In Slack, create a channel named `email` (public).
    2. Go to api.slack.com/apps, open the existing Big Matt's BBQ app, choose **Incoming Webhooks**,
       click **Add New Webhook to Workspace**, and select `#email`. Copy the generated URL.
       (You cannot reuse `SLACK_ORDERS_WEBHOOK_URL` — Slack binds each webhook to the one channel
       chosen at creation time.)
    3. Add `SLACK_EMAIL_WEBHOOK_URL=<the copied URL>` to your local `.env.local`.
    4. Run `npm run dev`, open http://localhost:3000, and submit the mailing-list signup form with a
       real first name and a test email address.
    5. Confirm in `#email` that exactly ONE message arrived, that it reads
       "New Email Subscriber — Big Matt's BBQ", and that it shows the Name, Email, and a
       "Signed up:" ISO timestamp you just submitted.
    6. Confirm nothing was posted to the orders Slack channel.
    7. Submit the form again with an obviously invalid email (e.g. `not-an-email`). Confirm the form
       shows its error and that NO new message appears in `#email`.
    8. Before deploying, add `SLACK_EMAIL_WEBHOOK_URL` to the Vercel project's environment variables
       (Settings -> Environment Variables) for the environments you want notified. If you skip this,
       the code is harmless — notifications are simply skipped in production.
  </how-to-verify>
  <action>
    Pause and present the how-to-verify steps above to the developer verbatim. Do not proceed, do not
    write a SUMMARY, and do not attempt to create the Slack channel or webhook yourself — creating a
    channel-bound Incoming Webhook has no CLI or API path and the workspace credentials are not
    available to Claude. Wait for the resume signal.
  </action>
  <done>
    Developer confirms a single correctly-formatted message landed in #email from a real signup, and
    that an invalid-email attempt produced no message.
  </done>
  <resume-signal>Type "approved" or describe what you saw instead</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> POST /api/mailing-list | Untrusted `email` and `firstName` cross here from an anonymous public form |
| server -> hooks.slack.com | Server-initiated outbound POST carrying subscriber-supplied text into an internal channel |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-tsd-01 | Tampering | `notifySlackNewSubscriber` message body | mitigate | Attacker submits `firstName` containing `<!channel>` or `<http://evil|click>` to mass-ping or phish the team via a trusted internal channel. Every interpolated user value is passed through `escapeSlackText()` (`&` first, then `<`, `>`); Test 8 asserts the raw sequence never reaches the payload. |
| T-tsd-02 | Denial of Service | signup request path | mitigate | A slow or down Slack endpoint must not stall or fail a customer signup. The `fetch` is never awaited and its rejection is absorbed by `.catch`; the function returns `void` (not `Promise<void>`) so it is structurally un-awaitable. Tests 6 and 7 assert a 200 with the webhook unset and with `fetch` rejecting. |
| T-tsd-03 | Information Disclosure | Slack `#email` channel contents | accept | Subscriber email addresses are posted to a private-workspace internal channel. This is the explicit intent of issue #15 and the same posture already accepted for customer emails in `SLACK_ORDERS_WEBHOOK_URL`. Channel membership is the access control. |
| T-tsd-04 | Information Disclosure | `SLACK_EMAIL_WEBHOOK_URL` value | mitigate | The webhook URL is a bearer secret (anyone holding it can post to `#email`). It is read from the server-side environment only, never prefixed `NEXT_PUBLIC_`, never returned in a response body, and `.env.example` carries only the empty key — no real URL is ever committed. |
| T-tsd-05 | Spoofing | unauthenticated signup endpoint | accept | The endpoint is intentionally public, so anyone can generate `#email` notifications by submitting signups. This is pre-existing exposure (the endpoint already writes to Resend unauthenticated); the notification adds noise but no new capability. Out of scope for issue #15. |
| T-tsd-SC | Tampering | npm installs | n/a | This plan installs zero new packages — no `package.json` change, no lockfile change. The Package Legitimacy Gate does not apply. |
</threat_model>

<verification>
- `npx vitest run tests/mailingListSlack.test.ts` — 8 passing tests
- `npm run test` — full suite green, zero regressions against the existing 300+ tests
- `npx tsc --noEmit` — clean
- `npm run build` — production build succeeds
- `grep -c 'notifySlackNewSubscriber' app/api/mailing-list/route.ts` (comments excluded) — exactly 2
- `git diff --stat` — exactly 3 files changed: the route, the new test file, `.env.example`
- Human checkpoint confirms one real message lands in `#email` and none on the 400 path
</verification>

<success_criteria>
Mapped to the issue #15 acceptance criteria:

- [ ] A new `#email` Slack channel is the notification destination — satisfied by the dedicated `SLACK_EMAIL_WEBHOOK_URL` webhook, confirmed at the human checkpoint (step 2/5)
- [ ] Each successful signup produces exactly one notification — single call site on the success branch; Test 1 asserts `fetch` called once
- [ ] The notification clearly identifies a new email subscriber signup — "New Email Subscriber — Big Matt's BBQ" header line; Test 1
- [ ] The notification includes the subscriber email plus available context — Name, Email, and ISO `Signed up:` timestamp; Tests 1 and 2
- [ ] Failed signup attempts generate no notification — Tests 3, 4, and 5 cover the 400 path, the Resend-error 500 path, and the missing-env 500 path
- [ ] Notification behavior does not degrade the customer signup flow — fire-and-forget, non-async, `.catch`-swallowed; Tests 6 and 7
</success_criteria>

<output>
Create `.planning/quick/260910-tsd-send-a-slack-notification-for-new-email-/260910-tsd-SUMMARY.md` when done
</output>
