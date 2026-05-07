# Security Review — Big Matt's BBQ
**Reviewed:** May 7, 2026
**Reviewer:** Claude (senior security engineer lens)
**Scope:** All TypeScript source in `app/`, `components/`, and `lib/`
**Methodology:** Static analysis — input validation, auth/authz, injection, data exposure. Only findings with ≥80% confidence of real exploitability are reported.

---

## Severity Legend
- 🔴 **Critical** — Directly exploitable; fix before the next drop
- 🟠 **High** — Clear vulnerability requiring specific conditions but significant impact
- 🟡 **Medium** — Concrete issue that amplifies the impact of a secondary compromise
- 🟢 **Low** — Defense-in-depth gap with limited standalone exploitability

---

## Finding 1 — Unsanitized HTML in Broadcast Emails

**Severity:** 🟡 Medium
**File:** `app/api/admin/broadcast/route.ts:99`
**Status:** DONE

### Problem
The broadcast endpoint accepts a raw `html` field from the request body. Zod validated it as a non-empty string but applied no sanitization or allowed-tag restriction. This HTML was concatenated directly into the email body sent to every subscribed address:

```ts
const finalHtml = `${html}
<hr style="margin-top: 24px; border: 0; border-top: 1px solid #ccc;" />
<p style="font-size: 12px; color: #666;">
  Don't want these? <a href="${unsubscribeUrl}">Unsubscribe</a>.
</p>`;
```

The only access control is a `BROADCAST_SECRET` bearer token check (minimum 16 characters, compared with plain `===`). If that secret is ever compromised — via a leaked `.env`, a Vercel dashboard breach, or a weak chosen value — an attacker can inject arbitrary HTML into an email sent to every subscriber on the mailing list.

### Exploit Scenario
1. Attacker obtains `BROADCAST_SECRET` (leaked credential, compromised hosting account, brute force of a weak value).
2. `POST /api/admin/broadcast` with `Authorization: Bearer <secret>` and a body containing a phishing form or credential-harvesting link styled to look like an authentic Big Matt's BBQ order email.
3. Resend delivers fully attacker-controlled HTML to every subscribed address.
4. Subscribers receive what appears to be a legitimate drop announcement but contains malicious content — click-jacking forms, fake payment pages, or malware distribution links.

The secondary consequence is subscriber list exposure: a successful call also iterates over the entire `mailing_list` table to build the recipient list, so the attacker now has every subscriber email address.

### Fix Applied
`sanitize-html` with a strict allowlist is applied to the `html` field before it is embedded in the email template:

```ts
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "b", "i", "em", "strong", "ul", "ol", "li", "a", "h1", "h2", "h3"],
  allowedAttributes: { a: ["href"] },
  allowedSchemes: ["https", "mailto"]
};

const safeHtml = sanitizeHtml(html, SANITIZE_OPTIONS);
```

`<script>` tags, `javascript:` hrefs, inline event handlers, and all other dangerous constructs are stripped. Two test cases in `tests/broadcast.test.ts` verify the behaviour.

---

## Findings Reviewed and Excluded

The following issues were identified during analysis but do not meet the confidence threshold for reporting as actionable vulnerabilities.

| Finding | Why Excluded |
|---|---|
| Square API error body logged (`lib/logger.ts:6`, `lib/square.ts:48`) | Square error responses rarely echo PII. Zod pre-validates all customer-supplied data (email, name) before any Square call, so the cases most likely to produce PII-containing error bodies (e.g., duplicate customer) are uncommon edge conditions. Confidence 7/10 — below threshold. |
| `BROADCAST_SECRET` compared with `===` (timing attack) | Timing attacks over HTTPS are impractical due to network jitter. Excluded as a low-impact web vulnerability per methodology exclusions. |
| `orderItems` / `cart` capacity mismatch in checkout | If `orderItems` is provided, Square order items can differ from what was capacity-checked via `cart`. However, the invoice is sent to the *attacker's* email address, making this self-defeating as an attack. Business logic concern, not a security vulnerability. Confidence 6/10. |
| `/api/test-seed` data exposure | Already guarded by `env.environment !== "sandbox"` — returns 404 in production. Confirmed by code review Issue 1 (marked DONE). No production risk. |
| React component XSS | No `dangerouslySetInnerHTML`, `eval`, or `innerHTML` assignments found anywhere in `components/` or `app/`. React's default escaping applies throughout. |
| `/api/dev/set-inventory` unauthenticated write | Sandbox-only gate (`env.environment !== "sandbox"`) prevents execution in production. Not a vulnerability in the deployed environment. |

---

## Summary

| Status | Severity | Finding | Effort | File |
|--------|----------|---------|--------|------|
| DONE | 🟡 Medium | Unsanitized HTML injected into broadcast emails | Low | `app/api/admin/broadcast/route.ts:99` |

**Overall posture:** The codebase has a solid security foundation — Zod validation at every API boundary, parameterized Supabase queries throughout (no SQL injection surface), proper use of `crypto.randomUUID()` for idempotency keys, HMAC-signed JWTs for unsubscribe tokens, and no use of `eval` or `dangerouslySetInnerHTML` in any component. The single actionable finding has been remediated.

---

*Review conducted by static analysis of source files. No dynamic testing performed.*
