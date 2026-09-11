---
phase: quick-260910-sbl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/mailing-list/route.ts
  - components/MailingListSection.tsx
  - components/SoldOutCapture.tsx
  - emails/DropNotificationEmail.tsx
  - tests/mailingList.test.ts
  - tests/dropNotificationEmail.test.ts
autonomous: true
requirements:
  - ISSUE-16
user_setup: []

must_haves:
  truths:
    - "A visitor must enter a first name in addition to an email on the footer signup form before the submit button enables"
    - "A visitor must enter a first name in addition to an email on the sold-out inline capture widget before the submit button enables"
    - "POST /api/mailing-list returns 400 when firstName is missing, empty, or whitespace-only, and does not call Resend"
    - "POST /api/mailing-list forwards firstName to resend.contacts.create when the payload is valid"
    - "The rendered drop notification email HTML contains a literal {{{FIRST_NAME|there}}} merge tag so subscribers without a stored first name read 'there'"
  artifacts:
    - path: "app/api/mailing-list/route.ts"
      provides: "Zod schema with required trimmed firstName; firstName passed to contacts.create"
      contains: "firstName"
    - path: "components/MailingListSection.tsx"
      provides: "Required first-name text input, firstName in POST body"
      contains: "firstName"
    - path: "components/SoldOutCapture.tsx"
      provides: "Required first-name text input, firstName in POST body"
      contains: "firstName"
    - path: "emails/DropNotificationEmail.tsx"
      provides: "Greeting line with Resend merge-tag fallback"
      contains: "FIRST_NAME"
    - path: "tests/mailingList.test.ts"
      provides: "Coverage for firstName validation and pass-through"
      contains: "firstName"
    - path: "tests/dropNotificationEmail.test.ts"
      provides: "Assertion that merge tag survives rendering"
      contains: "FIRST_NAME"
  key_links:
    - from: "components/MailingListSection.tsx"
      to: "/api/mailing-list"
      via: "fetch POST body includes firstName"
      pattern: "JSON\\.stringify\\(\\{[^}]*firstName"
    - from: "components/SoldOutCapture.tsx"
      to: "/api/mailing-list"
      via: "fetch POST body includes firstName"
      pattern: "JSON\\.stringify\\(\\{[^}]*firstName"
    - from: "app/api/mailing-list/route.ts"
      to: "resend.contacts.create"
      via: "firstName field on the create payload"
      pattern: "firstName:\\s*parsed\\.data\\.firstName"
---

<objective>
Collect a required first name on both mailing-list signup surfaces, store it on the Resend contact, and personalize the drop notification email with a graceful fallback for contacts created before this change.

Purpose: Personalized broadcast emails ("Hey Matt," instead of a cold open) without adding any new data store — Resend stays the sole subscriber record.
Output: First-name input on both forms, extended Zod schema + Resend payload, merge-tag greeting in the email template, and tests covering all three.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md

@app/api/mailing-list/route.ts
@components/MailingListSection.tsx
@components/SoldOutCapture.tsx
@emails/DropNotificationEmail.tsx
@tests/mailingList.test.ts
@tests/dropNotificationEmail.test.ts

<interfaces>
<!-- Contracts the executor needs. Extracted from the codebase — no exploration required. -->

Current Zod schema in app/api/mailing-list/route.ts:
  const schema = z.object({ email: z.string().trim().toLowerCase().email() });

Current Resend call in the same route:
  const { error } = await resend.contacts.create({
    audienceId: env.audienceId,
    email: parsed.data.email,
    unsubscribed: false
  });

resend@^6.12.2 CreateContactOptions already declares `firstName?: string` — no SDK change, no type cast needed.

Existing invalid-payload response shape (reuse verbatim, only the message string may change):
  NextResponse.json({ error: "...", requestId }, { status: 400 })

Test harness in tests/mailingList.test.ts:
  const contactsCreateMock = vi.fn();
  mockResend(result) -> vi.doMock("resend", ...) exposing `contacts.create = contactsCreateMock`
  Payload assertions read: contactsCreateMock.mock.calls[0][0]

Both form components share this shape:
  type FormState = "idle" | "submitting" | "success" | "error";
  const [email, setEmail] = useState("");
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { ... }
  Submit button disabled={state === "submitting" || email.length === 0}

Email template already proves the triple-brace mechanism survives @react-email/render:
  <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}">
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Require and forward firstName in the mailing-list API route</name>
  <files>app/api/mailing-list/route.ts, tests/mailingList.test.ts</files>
  <behavior>
    - Existing 200-path test: body now includes firstName; assert the contacts.create payload carries firstName with the trimmed value.
    - New test: body omits firstName entirely -> 400, contactsCreateMock not called.
    - New test: firstName is "" -> 400, contactsCreateMock not called.
    - New test: firstName is "   " (whitespace only) -> 400, contactsCreateMock not called.
    - New test: firstName "  Matt  " -> 200 and contacts.create receives "Matt" (trim applied by the schema).
    - Existing 400-on-invalid-email test keeps a valid firstName so it still isolates the email failure.
    - Existing duplicate-upsert and 500 tests get a valid firstName added so they reach the Resend call as before.
  </behavior>
  <action>
    Write the test updates in tests/mailingList.test.ts FIRST and confirm the new firstName cases fail against the current route.

    Then extend the Zod schema in app/api/mailing-list/route.ts to:
      z.object({
        email: z.string().trim().toLowerCase().email(),
        firstName: z.string().trim().min(1)
      })
    Order the email field first so the object literal stays readable. Keep `safeParse` — never `parse`, per CLAUDE.md.

    Update the 400 branch message to cover both fields (e.g. "Invalid name or email.") and keep the exact existing response shape: NextResponse.json({ error, requestId }, { status: 400 }). Do not add per-field error detail — the route deliberately returns a generic message.

    Add `firstName: parsed.data.firstName` to the resend.contacts.create payload alongside email/audienceId/unsubscribed. No cast or `as any` — CreateContactOptions already types firstName as optional string.

    Do not touch the getResendEnv block, the logError calls, or the catch-all 500 handler. Add no comments.
  </action>
  <verify>
    <automated>npx vitest run tests/mailingList.test.ts</automated>
  </verify>
  <done>All mailingList tests pass, including the four new firstName cases; contacts.create receives a trimmed firstName on the success path and is never called on 400.</done>
</task>

<task type="auto">
  <name>Task 2: Add required first-name input to both signup forms</name>
  <files>components/MailingListSection.tsx, components/SoldOutCapture.tsx</files>
  <action>
    In components/MailingListSection.tsx:
    - Add `const [firstName, setFirstName] = useState("");` next to the existing email state.
    - Add a text input BEFORE the email input inside the form: type="text", required, value={firstName}, onChange sets state, placeholder "First name", aria-label "First name", disabled={state === "submitting"}. Reuse the existing `input-field` class and match the email input's sizing utility (the form is `flex-col gap-3 sm:flex-row sm:justify-center`, so use a narrower sm width such as `sm:w-44` and leave the email input at `sm:w-72`).
    - Include firstName in the POST body: JSON.stringify({ firstName, email }).
    - Extend the submit-disabled guard to also block empty first name: `disabled={state === "submitting" || email.length === 0 || firstName.trim().length === 0}`.

    In components/SoldOutCapture.tsx:
    - Add the same `firstName` state.
    - The form is a single-row `flex gap-2` with a narrow inline layout; change the form container to stack the two inputs (e.g. wrap inputs in a `flex gap-2` row and keep the button on its own row, or switch the form to `flex flex-col gap-2` with an inner `flex gap-2` input row). Pick whichever keeps the widget readable at mobile width — this is a compact inline widget, so do not let the inputs shrink below usable size.
    - First-name input: type="text", required, value={firstName}, placeholder "First name", aria-label "First name for drop notifications", disabled={state === "submitting"}, class matching the email input's compact styling (`input-field min-w-0 flex-1 py-2 text-xs`).
    - Include firstName in the POST body: JSON.stringify({ firstName, email }).
    - Extend the submit-disabled guard the same way as above.

    Keep `noValidate` on both forms and keep the existing success/error rendering untouched. 2-space indent, camelCase, no comments.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npm run build</automated>
  </verify>
  <done>Both components compile and build clean; each renders a required first-name field, sends firstName in the POST body, and keeps submit disabled until both fields have non-whitespace content.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Personalize the drop notification email with a fallback merge tag</name>
  <files>emails/DropNotificationEmail.tsx, tests/dropNotificationEmail.test.ts</files>
  <behavior>
    - Rendered HTML contains the literal string "{{{FIRST_NAME|there}}}" (braces and pipe unescaped, exactly as Resend expects).
    - Existing assertions for {{{RESEND_UNSUBSCRIBE_URL}}}, drop=spring-24, and the base-URL fallback continue to pass.
  </behavior>
  <action>
    Write the new assertion in tests/dropNotificationEmail.test.ts first — a case asserting `expect(html).toContain("{{{FIRST_NAME|there}}}")` — and confirm it fails.

    Then add a greeting Text block in emails/DropNotificationEmail.tsx between the "Big Matt's BBQ Drop is Live" heading and the `{subject}` Text.

    CRITICAL JSX detail: bare `{{{FIRST_NAME|there}}}` in JSX children is parsed as a JS expression and will not compile. Emit it as a string literal expression, e.g. `{"Hey {{{FIRST_NAME|there}}},"}` — a single braces-wrapped string child. Do not attempt to escape the pipe or the braces; @react-email/render leaves both intact in text content, exactly as it already does for the unsubscribe href.

    Style the greeting to match the body copy already in the template: color "#d1d1d1", fontSize "16px", lineHeight "24px", margin "0 0 16px 0". Add no new props to DropNotificationEmailProps — personalization is resolved by Resend at send time, not by the component.

    Do not modify app/api/admin/broadcast/route.tsx or tests/broadcast.test.ts — that test mocks render() output and is intentionally decoupled from template content.
  </action>
  <verify>
    <automated>npx vitest run tests/dropNotificationEmail.test.ts tests/broadcast.test.ts</automated>
  </verify>
  <done>The rendered email HTML contains the literal {{{FIRST_NAME|there}}} greeting, all pre-existing email tests still pass, and broadcast tests are unaffected.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser form → POST /api/mailing-list | Untrusted `firstName` string crosses here from an unauthenticated public form |
| Resend contact store → broadcast email HTML | Stored `firstName` is interpolated into outgoing email bodies by Resend at send time |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-sbl-01 | Tampering | `app/api/mailing-list/route.ts` firstName input | mitigate | Zod `z.string().trim().min(1)` via `safeParse` at the route boundary; non-string, missing, or blank values rejected with 400 before any Resend call |
| T-sbl-02 | Information Disclosure | 400/500 responses | mitigate | Keep the existing generic error strings (`{ error, requestId }`); do not surface Zod field paths or Resend error text to the client — preserves the current `expect(body.error).not.toContain("rate limited")` guarantee |
| T-sbl-03 | Tampering | Injected content in broadcast email via stored firstName | accept | Resend escapes merge-tag substitutions into HTML text context; no unbounded-length or character-class risk beyond what Resend already handles for a plain-text greeting. No PII beyond a first name already paired with an email the subscriber supplied |
| T-sbl-04 | Denial of Service | Public unauthenticated signup endpoint | accept | Pre-existing exposure unchanged by this plan; one additional short string field adds no meaningful amplification. Resend's own rate limiting returns the 500 path already covered by tests |
| T-sbl-SC | Tampering | npm/pip/cargo installs | mitigate | Not applicable — zero new dependencies. `resend@^6.12.2` already types `firstName?: string` in `CreateContactOptions`; no install step in this plan |
</threat_model>

<verification>
1. `npm run test` — full Vitest suite passes, no regressions in broadcast, checkout, inventory, or cart tests.
2. `npx tsc --noEmit` — clean.
3. `npm run build` — production build succeeds.
4. `grep -n "firstName" app/api/mailing-list/route.ts components/MailingListSection.tsx components/SoldOutCapture.tsx` — firstName present in all three.
5. `grep -c "FIRST_NAME" emails/DropNotificationEmail.tsx` — returns 1 or more.
6. `git diff --name-only` — confirms `app/api/admin/broadcast/route.tsx` and `tests/broadcast.test.ts` are NOT in the changed set.
</verification>

<success_criteria>
- Both signup forms require a non-blank first name before submit enables, and send `firstName` in the POST body.
- `POST /api/mailing-list` returns 400 with `{ error, requestId }` for missing, empty, or whitespace-only `firstName`, and never reaches Resend in those cases.
- A valid request passes a trimmed `firstName` into `resend.contacts.create` alongside `audienceId`, `email`, and `unsubscribed: false`.
- Rendered `DropNotificationEmail` HTML contains the literal `{{{FIRST_NAME|there}}}` so legacy contacts without a stored first name read "Hey there,".
- `npm run test`, `npx tsc --noEmit`, and `npm run build` all pass.
- No changes to the broadcast route, broadcast tests, the Supabase `mailing_list` table, or `package.json`.
</success_criteria>

<output>
Create `.planning/quick/260910-sbl-collect-subscriber-first-name-for-person/260910-sbl-SUMMARY.md` when done
</output>
