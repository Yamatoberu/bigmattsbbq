---
phase: quick-260918-wec
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/env.ts
  - .env.example
  - tests/mailingList.test.ts
  - app/api/mailing-list/route.ts
autonomous: true
requirements: [ISSUE-18]
issue: 18

must_haves:
  truths:
    - "A brand-new mailing-list subscriber triggers exactly one Resend custom event (RESEND_WELCOME_EVENT) with payload FIRST_NAME"
    - "A duplicate submit by an already-subscribed contact does NOT trigger the welcome event (no duplicate welcome emails)"
    - "A previously-unsubscribed contact who re-subscribes triggers the welcome event again"
    - "When RESEND_WELCOME_EVENT is unset, the route never calls contacts.get or events.send and behaves exactly as today"
    - "The welcome trigger can never change the HTTP status: 200 on create success, 400/500 paths unchanged, lookup/trigger failures only console.warn"
  artifacts:
    - path: "lib/env.ts"
      provides: "ResendEnv.welcomeEvent optional field read from RESEND_WELCOME_EVENT"
      contains: "welcomeEvent"
    - path: "app/api/mailing-list/route.ts"
      provides: "shouldSendWelcome + triggerWelcomeAutomation helpers wired into POST"
      contains: "events.send"
    - path: "tests/mailingList.test.ts"
      provides: "17 passing tests (9 existing + 8 welcome-automation cases)"
      min_lines: 300
    - path: ".env.example"
      provides: "Documented optional RESEND_WELCOME_EVENT in the Phase 8 Resend block"
      contains: "RESEND_WELCOME_EVENT"
  key_links:
    - from: "app/api/mailing-list/route.ts"
      to: "lib/env.ts"
      via: "getResendEnv().welcomeEvent gates the whole feature"
      pattern: "env\\.welcomeEvent"
    - from: "app/api/mailing-list/route.ts"
      to: "resend.contacts.get"
      via: "pre-create dedup lookup inside shouldSendWelcome"
      pattern: "contacts\\.get\\("
    - from: "app/api/mailing-list/route.ts"
      to: "resend.events.send"
      via: "after() callback inside triggerWelcomeAutomation, only when shouldWelcome && create succeeded"
      pattern: "events\\.send\\("
---

<objective>
Trigger the Resend welcome-email Automation when a genuinely new (or re-subscribing) contact signs up via `POST /api/mailing-list`, without sending duplicate welcome emails on repeat submits, and without ever affecting the response status. Implements the locked tech design posted on GitHub issue #18.

Purpose: Resend Automations fire a run on EVERY event with no server-side dedup, and `contacts.create` on an existing email succeeds silently. So the route must (1) look up the contact before creating it to decide whether a welcome is warranted, and (2) fire `resend.events.send` in an `after()` callback only when warranted. The whole feature is gated on the optional `RESEND_WELCOME_EVENT` env var so it is a no-op until the dashboard Automation exists.

Output: `lib/env.ts` (optional `welcomeEvent`), `app/api/mailing-list/route.ts` (two helpers + wiring), `.env.example` (documented var), `tests/mailingList.test.ts` (17 tests).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@lib/env.ts
@app/api/mailing-list/route.ts
@tests/mailingList.test.ts
@.env.example

<locked_design>
Approved tech design from issue #18. Every point is LOCKED — implement exactly, do not add alternatives.

Verified SDK facts (resend@6.28.0 already in package.json — NO new dependency, NO install task):
- `resend.events.send({ event: string, email: string, payload?: Record<string, unknown> })` → `POST /events/send`. Success: `{ data: { object: 'event', event }, error: null }`.
- `resend.contacts.get({ email, audienceId })` → found: `{ data: Contact, error: null }`; not found: `{ data: null, error: { name: 'not_found', message, statusCode } }`. `Contact` has `unsubscribed: boolean`, `first_name: string | null`, `email`, `id`, `created_at`.
- `resend.contacts.create` on an existing email succeeds and returns the existing id — it does NOT indicate newness. Hence the pre-check.
- Resend Automations create a run on EVERY event — dedup must be enforced in our code.

Out of scope: no Supabase changes, no component changes, no changes to `app/api/admin/broadcast`, no change to which vars `getResendEnv()` requires, no new dependencies, no `lib/resend.ts` extraction (helpers stay in the route file like `notifySlackNewSubscriber`).
</locked_design>

<interfaces>
<!-- Current contracts the executor builds against. No codebase exploration needed. -->

From lib/env.ts (current):
```typescript
export interface ResendEnv {
  apiKey: string;
  audienceId: string;
  segmentId: string;
}
export function getResendEnv(): ResendEnv; // throws if RESEND_API_KEY / RESEND_AUDIENCE_ID / RESEND_SEGMENT_ID missing
```

From app/api/mailing-list/route.ts (current, relevant shape):
```typescript
import { NextResponse, after } from "next/server";
import { Resend } from "resend";
import { getResendEnv } from "../../../lib/env";
async function notifySlackNewSubscriber({ email, firstName, signedUpAt }): Promise<void>; // console.warn on failure, never throws
export async function POST(request: Request);
// inside POST: `let env: { apiKey: string; audienceId: string };` — NOTE this local annotation must be widened (see Task 3)
// order today: Zod safeParse → getResendEnv → new Resend → contacts.create → after(Slack) → 200
```

From tests/mailingList.test.ts (current harness):
```typescript
const afterQueue = vi.hoisted(() => [] as Array<() => unknown>);   // next/server after() is mocked to push here
async function flushAfter(): Promise<void>;                          // runs + clears afterQueue
const contactsCreateMock = vi.fn();
function mockResend(result: ContactsResult) {                         // vi.doMock("resend", () => ({ Resend: class { contacts = { create: contactsCreateMock } } }))
  ...
}
// beforeEach: vi.resetModules(); afterQueue.length = 0; contactsCreateMock.mockReset(); sets RESEND_API_KEY / RESEND_AUDIENCE_ID / RESEND_SEGMENT_ID
// each test: mockResend(...); const { POST } = await import("../app/api/mailing-list/route"); build Request; await POST(req)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add optional RESEND_WELCOME_EVENT to ResendEnv and document it in .env.example</name>
  <files>lib/env.ts, .env.example</files>
  <action>
In `lib/env.ts`, add `welcomeEvent?: string` to the exported `ResendEnv` interface (after `segmentId`). In `getResendEnv()`, read `const welcomeEventRaw = process.env.RESEND_WELCOME_EVENT;`, derive `const welcomeEvent = welcomeEventRaw?.trim() || undefined;` (trimmed; empty/whitespace-only string is treated as unset). Do NOT add it to the `if (!apiKey || !audienceId || !segmentId)` guard and do NOT change the error message — the function must still throw only for the three existing vars. Return `{ apiKey, audienceId, segmentId, welcomeEvent }`. Keep the existing 2-space, no-comment style.

In `.env.example`, inside the `# Phase 8 — Resend Contacts + Broadcasts` block (after the `RESEND_SEGMENT_ID=` line, before the blank line preceding `# Slack notifications`), add a commented entry followed by the var line. The comment must state: it is the name of the custom event that triggers the welcome-email Automation (Resend dashboard → Automations); it is optional — unset means no welcome event is sent; it must match the Automation Trigger step's event name exactly; suggested value `subscriber.welcome`. Then the line `RESEND_WELCOME_EVENT=` (leave the value empty like the other entries). Match the surrounding comment wrapping style (`# ` prefix, ~85-col lines).
  </action>
  <verify>
    <automated>cd /home/mgregory/Development/bigmattsbbq && npx tsc --noEmit && grep -v '^#' .env.example | grep -c '^RESEND_WELCOME_EVENT=' | grep -qx 1 && grep -c 'welcomeEvent' lib/env.ts | awk '$1>=3{exit 0}{exit 1}' && npx vitest run tests/mailingList.test.ts</automated>
  </verify>
  <done>`ResendEnv` exposes optional `welcomeEvent`; `getResendEnv()` returns it (trimmed, empty → undefined) without requiring it; `.env.example` documents `RESEND_WELCOME_EVENT` in the Phase 8 block; `tsc --noEmit` clean; existing 9 mailing-list tests still pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extend the mailing-list test harness and add the 8 welcome-automation cases (RED)</name>
  <files>tests/mailingList.test.ts</files>
  <behavior>
    Harness changes (all existing 9 tests must pass unchanged):
    - Add module-scoped `contactsGetMock = vi.fn()` and `eventsSendMock = vi.fn()`; reset both in `beforeEach` alongside `contactsCreateMock`.
    - `beforeEach` also sets `process.env.RESEND_WELCOME_EVENT = "subscriber.welcome"`.
    - `mockResend(result, overrides?)`: the mocked `Resend` class exposes `contacts = { create: contactsCreateMock, get: contactsGetMock }` and `events = { send: eventsSendMock }`. Default `get` resolves `{ data: null, error: { name: "not_found", message: "not found", statusCode: 404 } }`; default `events.send` resolves `{ data: { object: "event", event: "subscriber.welcome" }, error: null }`. Individual tests override via `contactsGetMock.mockResolvedValue(...)` / `eventsSendMock.mockResolvedValue(...)` / `.mockRejectedValue(...)` after calling `mockResend`.
    - Widen the `ContactsResult` error type (or add a sibling `ContactsGetResult` type) so `statusCode?: number` and a found-contact `data` shape `{ object: "contact"; id: string; email: string; first_name: string | null; unsubscribed: boolean; created_at: string }` typecheck.
    New cases (new `describe` block or appended `it`s; each builds the same Request shape as existing tests with `{ email: "new@example.com", firstName: "Matt" }` unless noted):
    - Test 1 — new subscriber: `get` → not_found (default). `POST` → 200, `contactsCreateMock` called once; `await flushAfter()`; `eventsSendMock` called exactly once with `{ event: "subscriber.welcome", email: "new@example.com", payload: { FIRST_NAME: "Matt" } }`.
    - Test 2 — active duplicate: `get` → `{ data: { ...contact, unsubscribed: false }, error: null }`. 200; `contactsCreateMock` called once; after `flushAfter()`, `eventsSendMock` NOT called.
    - Test 3 — re-subscribe: `get` → `{ data: { ...contact, unsubscribed: true }, error: null }`. 200; after `flushAfter()`, `eventsSendMock` called once.
    - Test 4 — lookup non-not_found error: `get` → `{ data: null, error: { name: "rate_limit_exceeded", message: "rate limited", statusCode: 429 } }`. 200; `contactsCreateMock` called once; after `flushAfter()`, `eventsSendMock` NOT called.
    - Test 5 — env unset: `delete process.env.RESEND_WELCOME_EVENT` before import. 200; `contactsGetMock` NOT called; after `flushAfter()`, `eventsSendMock` NOT called.
    - Test 6 — create error: `mockResend({ data: null, error: { message: "boom", name: "internal_server_error" } })`. 500; after `flushAfter()`, `eventsSendMock` NOT called.
    - Test 7 — trigger failure is swallowed: two assertions/cases — (a) `eventsSendMock.mockResolvedValue({ data: null, error: { name: "validation_error", message: "bad", statusCode: 422 } })` and (b) `eventsSendMock.mockRejectedValue(new Error("network"))`. In both: 200, `contactsCreateMock` called once, and `await flushAfter()` resolves without throwing.
    - Test 8 — invalid body: `{ email: "not-an-email", firstName: "Matt" }`. 400; `contactsGetMock` NOT called; `eventsSendMock` NOT called.
    Suppress noisy output in Tests 4 and 7 with `vi.spyOn(console, "warn").mockImplementation(() => {})` and restore in `afterEach` via `vi.restoreAllMocks()`.
  </behavior>
  <action>
Implement the harness changes and the 8 cases exactly as listed in `<behavior>`. Keep the existing 9 tests byte-for-byte unchanged apart from any type-widening required by `ContactsResult`. Keep the dynamic-import-after-`mockResend` pattern so `vi.resetModules()` isolation continues to work. Run the file: the 9 existing tests must pass; Tests 1, 3 must FAIL (route does not call `events.send` yet) — that is the expected RED state. Tests 2, 4, 5, 6, 8 may pass trivially at this point; that is fine. Commit as `test(quick-260918-wec): add welcome-automation cases for mailing-list route (#18)`.
  </action>
  <verify>
    <automated>cd /home/mgregory/Development/bigmattsbbq && npx vitest run tests/mailingList.test.ts 2>&1 | grep -E 'Tests +[0-9]+ failed \| [0-9]+ passed \([0-9]+\)' | grep -E '\(17\)'</automated>
  </verify>
  <done>File contains 17 tests; 9 originals pass; the welcome-send positive cases fail because the route has no trigger yet; harness exposes `contacts.get` and `events.send` mocks with the locked defaults.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Implement shouldSendWelcome + triggerWelcomeAutomation and wire into POST (GREEN)</name>
  <files>app/api/mailing-list/route.ts</files>
  <behavior>
    - All 17 tests in tests/mailingList.test.ts pass.
    - `npm run test` (full suite) passes; `npx tsc --noEmit` clean.
  </behavior>
  <action>
In `app/api/mailing-list/route.ts`, keep the existing structure (Zod → `getResendEnv` → `contacts.create` → `after(Slack)` → 200). Add two module-scoped async helpers directly below `notifySlackNewSubscriber`, mirroring its style (plain `async function`, `console.warn` on failure, nothing thrown escapes):

(a) `shouldSendWelcome(resend: Resend, audienceId: string, email: string): Promise<boolean>` — inside `try`: `const { data, error } = await resend.contacts.get({ email, audienceId });` then: if `error?.name === "not_found"` return `true`; else if `error` → `console.warn("mailing-list contact lookup failed", error)` and return `false` (fail closed); else if `data?.unsubscribed === true` return `true`; else return `false`. `catch (err)` → `console.warn("mailing-list contact lookup failed", err)` and return `false`.

(b) `triggerWelcomeAutomation(resend: Resend, event: string, email: string, firstName: string): Promise<void>` — inside `try`: `const { error } = await resend.events.send({ event, email, payload: { FIRST_NAME: firstName } });` if `error` → `console.warn("welcome automation trigger failed", error)`. `catch (err)` → `console.warn("welcome automation trigger failed", err)`. Payload key is exactly `FIRST_NAME` (matches the Resend template variable). Never throws.

Wiring in `POST`:
- Change the local `let env: { apiKey: string; audienceId: string };` annotation to `let env: ResendEnv;` and add `ResendEnv` to the existing import from `../../../lib/env` (`import { getResendEnv, type ResendEnv } from ...`). Without this the `welcomeEvent` field is inaccessible.
- Immediately after `const resend = new Resend(env.apiKey);` and BEFORE `contacts.create`: `const welcomeEvent = env.welcomeEvent;` then `const shouldWelcome = welcomeEvent ? await shouldSendWelcome(resend, env.audienceId, parsed.data.email) : false;`. When `RESEND_WELCOME_EVENT` is unset, `contacts.get` must not be called at all — the ternary guarantees this. Capturing `welcomeEvent` into a `const` is required so TypeScript narrowing survives into the `after()` closure.
- After the existing Slack `after(...)` and only on the success path (i.e. after the `if (error)` early return): `if (shouldWelcome && welcomeEvent) { after(() => triggerWelcomeAutomation(resend, welcomeEvent, parsed.data.email, parsed.data.firstName)); }`.
- Response contract unchanged: `{ ok: true }` 200; 400 invalid body, 500 env missing, 500 create error all untouched. The lookup and trigger paths must never influence the status code.

Run `npx vitest run tests/mailingList.test.ts` (17 pass), then `npm run test` and `npx tsc --noEmit`. Commit as `feat(quick-260918-wec): trigger Resend welcome automation on new mailing-list signup (#18)`.
  </action>
  <verify>
    <automated>cd /home/mgregory/Development/bigmattsbbq && npx tsc --noEmit && npx vitest run tests/mailingList.test.ts 2>&1 | grep -E 'Tests +17 passed \(17\)' && npm run test</automated>
  </verify>
  <done>17/17 mailing-list tests pass, full Vitest suite passes, `tsc --noEmit` clean; new subscribers and re-subscribers trigger exactly one `events.send` with `FIRST_NAME` payload via `after()`; active duplicates, lookup errors, create errors, invalid bodies, and unset `RESEND_WELCOME_EVENT` never trigger it; status codes are unchanged in every path.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → POST /api/mailing-list | Untrusted email/firstName crosses here (already Zod-validated) |
| route → Resend API | Outbound calls with server-held API key; responses are trusted-but-checked |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-wec-01 | Spoofing | events.send email/FIRST_NAME | accept | Same Zod-validated inputs already forwarded to contacts.create; Resend templates render FIRST_NAME as text, no HTML injection surface added here |
| T-wec-02 | Information disclosure | contacts.get pre-check | mitigate | Lookup result never surfaces in the response; response body remains `{ ok: true }` regardless of whether the contact existed, so the endpoint cannot be used as a subscriber oracle |
| T-wec-03 | Denial of service | extra Resend call per signup | accept | One additional GET per submit; fail-closed on rate_limit errors (no welcome, still 200) so Resend throttling cannot break signups |
| T-wec-04 | Repudiation / duplicate sends | Automation runs on every event | mitigate | shouldSendWelcome dedup gate (not_found or unsubscribed only) enforced in code before firing |
| T-wec-SC | Tampering | npm installs | accept | No package installs in this plan (resend@6.28.0 already present) |
</threat_model>

<verification>
- `npx vitest run tests/mailingList.test.ts` → 17 passed
- `npm run test` → all suites pass
- `npx tsc --noEmit` → no output
- `grep -n "welcomeEvent" lib/env.ts` shows interface field + return
- `grep -n "events.send\|contacts.get" app/api/mailing-list/route.ts` shows both calls inside the two helpers only
- `grep -v '^#' .env.example | grep '^RESEND_WELCOME_EVENT='` → exactly one line
</verification>

<success_criteria>
- Issue #18 locked design implemented point-for-point (env, route helpers, wiring order, response contract, `.env.example`, 8 tests)
- `getResendEnv()` still throws only for RESEND_API_KEY / RESEND_AUDIENCE_ID / RESEND_SEGMENT_ID
- No new dependencies, no changes outside the four listed files
- Commits reference `#18` and use the `quick-260918-wec` scope
</success_criteria>

<output>
Create `.planning/quick/260918-wec-trigger-resend-welcome-email-automation-/260918-wec-SUMMARY.md` when done
</output>
