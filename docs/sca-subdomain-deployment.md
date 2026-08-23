# SCA Tracker Subdomain Activation

## Status

**`sca.bigmattsbbq.com` is NOT yet live.** The manual steps in this checklist are **NOT yet performed**
— nothing below has been done. DNS lives at Hostinger, outside this repo, so no code task in this
repository can complete the cutover.

What **is** done:

- The application-side routing (`proxy.ts` + `lib/sca/routing.ts`) ships as part of this phase and is
  already live in every deployed environment.
- The SCA tracker is already reachable today at the `/sca` path on any host — `http://localhost:3000/sca`,
  any Vercel preview URL, and `https://bigmattsbbq.com/sca`.

Only the DNS + Vercel domain binding described below remains.

## What already works

- `/sca` is a real, directly visitable Next.js path segment (`app/sca`) — not a rewrite trick. It works
  today in dev (`http://localhost:3000/sca`), on every Vercel preview deployment, and on
  `https://bigmattsbbq.com/sca`.
- `*.vercel.app` preview URLs deliberately do **not** and should not match the sca host rule (D-03) —
  by design, `resolveScaRouting` only matches an exact configured hostname or anything starting with
  `sca.`. Preview deployments are exercised via the `/sca` path instead, not via a preview subdomain.
- Once the steps below are complete, `https://sca.bigmattsbbq.com/` will resolve to the exact same
  content as `/sca` today, with the clean subdomain shown in the browser's address bar (a rewrite, not
  a redirect).

## Step 1 — Add the domain in Vercel

- [ ] Open the Vercel dashboard for this project.
- [ ] Go to **Project Settings → Domains**.
- [ ] Click **Add** and enter `sca.bigmattsbbq.com`.
- [ ] Because this is a single named subdomain (not a wildcard `*.bigmattsbbq.com`), Vercel will display
      a **CNAME** target to add at the DNS host — typically `cname.vercel-dns.com`. No nameserver
      delegation to Vercel is required for this case.
- [ ] Copy the exact CNAME target value Vercel displays. Do not assume it is `cname.vercel-dns.com` —
      always use the literal value shown in the dashboard for this project.

## Step 2 — Add the CNAME at Hostinger

- [ ] Log in to Hostinger and open the DNS zone editor for the `bigmattsbbq.com` domain.
- [ ] Add a new DNS record:
  - **Type:** `CNAME`
  - **Name / Host:** `sca`
  - **Value / Points to:** the exact target Vercel displayed in Step 1 (e.g. `cname.vercel-dns.com`),
    copied verbatim — including a trailing period if Hostinger's editor shows one.
  - **TTL:** leave at the default value.
- [ ] Save the record.
- [ ] Do **not** guess the target value or reuse a CNAME target from a different project/tutorial — an
      incorrect value here will fail Vercel's validation or, worse, point the subdomain nowhere.

## Step 3 — Verify

- [ ] `dig +short sca.bigmattsbbq.com` resolves to a Vercel target (may take time to propagate after
      Step 2).
- [ ] The Vercel dashboard's Domains panel shows `sca.bigmattsbbq.com` as **"Valid Configuration"**.
- [ ] `curl -sI https://sca.bigmattsbbq.com/` returns `HTTP/2 200`.
- [ ] `curl -s https://sca.bigmattsbbq.com/` output contains `SCA Tracker` — this proves `proxy.ts`
      fired against a real `Host` header, not merely that the `/sca` path works.
- [ ] `curl -sI https://bigmattsbbq.com/` still returns `HTTP/2 200` and the storefront is unchanged —
      confirming the subdomain addition did not affect the main site.

## No config changes required

No `vercel.json` file exists in this repo, and none is needed for this activation — a single named
subdomain binding in the Vercel dashboard plus the app's existing `proxy.ts` is sufficient once DNS
resolves.

`SCA_HOSTNAME` (documented in `.env.example`) only needs to be set as a Vercel environment variable if
a hostname other than `sca.bigmattsbbq.com` is used for this deployment. The routing rule in
`lib/sca/routing.ts` already matches any hostname starting with `sca.` in addition to the exact
configured hostname, so a future `sca.staging.bigmattsbbq.com` subdomain is covered with zero code
changes — only a new DNS record and Vercel domain binding, following the same two steps above.

## Rollback

- [ ] Remove the CNAME record at Hostinger.
- [ ] Remove the `sca.bigmattsbbq.com` domain binding in Vercel Project Settings → Domains.

Remove both together. A CNAME left pointing at `cname.vercel-dns.com` after the Vercel domain binding
is removed is a classic dangling-subdomain takeover vector — always remove the DNS record and the
Vercel binding in the same pass, not one without the other.

Because `proxy.ts` only branches on the incoming `Host` header, removing the subdomain does not change
any storefront route or behavior — `bigmattsbbq.com` and `/sca` continue to work exactly as before.
