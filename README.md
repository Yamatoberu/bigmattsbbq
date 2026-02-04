# Big Matt's BBQ — Next.js + Supabase

Dark, smoky site for catering info and frozen BBQ drops with preorder + capacity control. Built for Vercel + Supabase using App Router, server actions, Tailwind, zod, and Resend email.

## Tech stack
- Next.js (App Router, TypeScript, Server Components + Actions)
- Tailwind CSS
- Supabase (Postgres)
- zod validation
- Resend (transactional email) — optional, falls back to logging

## Getting started
1) Install deps (requires registry access):
```bash
npm install
```
2) Copy env vars:
```bash
cp .env.example .env.local
```
3) Run locally:
```bash
npm run dev
```

## Environment variables
Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EMAIL_FROM` (e.g. `"Big Matt's BBQ <orders@bigmattsbbq.com>"`)

Optional
- `RESEND_API_KEY` (enable live confirmation email)
- `EMAIL_REPLY_TO`

## Supabase setup
1) Open `/supabase/schema.sql` in the Supabase SQL editor and run it. It creates:
   - Tables: drops, products, pickup_locations, drop_pickups, drop_inventory, customers, orders, order_items, mailing_list_subscribers, email_log
   - View: `v_drop_inventory_remaining`
   - RPC: `place_preorder(...)`
   - Seeds: Frozen Brisket, Frozen Pulled Pork, pickup locations for Cache Valley & Utah County
2) No RLS is defined; add policies later if needed.

## Creating a new drop
Minimal SQL example after running the schema:
```sql
-- 1) Create drop
insert into drops (name, status, starts_at, ends_at)
values ('February Drop', 'live', '2026-02-10T17:00:00Z', '2026-02-11T05:00:00Z')
returning id;

-- 2) Add pickup options (use the pickup_locations seeded earlier)
insert into drop_pickups (drop_id, pickup_location_id, start_time, end_time, instructions, enabled)
values
  ('<drop_id>', (select id from pickup_locations where name='Cache Valley'), '2026-02-10T18:00:00Z', '2026-02-10T20:00:00Z', 'Watch for the smoker trailer.', true),
  ('<drop_id>', (select id from pickup_locations where name='Utah County'), '2026-02-10T21:00:00Z', '2026-02-10T22:00:00Z', 'Text when you arrive.', true);

-- 3) Add inventory per product (bags available)
insert into drop_inventory (drop_id, product_id, bags_available, enabled)
values
  ('<drop_id>', (select id from products where name='Frozen Brisket'), 120, true),
  ('<drop_id>', (select id from products where name='Frozen Pulled Pork'), 160, true);
```
The site queries `status = 'live'` and uses `v_drop_inventory_remaining` to enforce remaining bags.

## Seeding products & pickup locations
- Products: edit the `products` seed rows in `/supabase/schema.sql` or insert via SQL.
- Pickup locations: use `pickup_locations` table (name, address, notes).

## Deploy to Vercel
1) Push this repo to GitHub.
2) In Vercel, create a new project, link the repo, set the env vars above (including Supabase keys + Resend if used).
3) Deploy. The app uses server actions; no API routes required.

## Email + logging
- If `RESEND_API_KEY` + `EMAIL_FROM` are set, successful preorders send a confirmation email.
- Regardless, the server action logs to `email_log` with status (sent/failed/skipped).

## Notes
- Payment is **not** collected online. The UI and copy state “Payment collected at pickup.”
- Replace `public/logo.jpg` with the provided Big Matt’s BBQ logo asset for best branding.
