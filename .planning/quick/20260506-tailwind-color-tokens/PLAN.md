---
title: Tailwind Color Tokens — Issue 14
slug: tailwind-color-tokens
date: 2026-05-06
status: in-progress
---

# Tailwind Color Tokens

Replace magic hex colors across app/ and components/ with named Tailwind design tokens.

## Tasks

### Task 1: Update tailwind.config.ts
- Add `gold` palette: `{ 300: "#f0c16a", 400: "#d8b56a", 600: "#b8893a" }`
- Add `pit` palette: `{ card: "#16100c", surface: "#120c09", btn: "#1c130f", img: "#201510" }`
- Adjust `smoke-400` from `"#3a2b23"` to `"#3a2a20"`

### Task 2: Replace in components/SectionHeader.tsx
- `text-[#f0c16a]` → `text-gold-300`

### Task 3: Replace in app/about/page.tsx
- `text-[#f0c16a]` → `text-gold-300`
- `border-[#3a2a20]` → `border-smoke-400`

### Task 4: Replace in app/catering/page.tsx
- `text-[#f0c16a]` → `text-gold-300`
- `border-[#3a2a20]` → `border-smoke-400`
- `bg-[#1c140f]` → `bg-pit-card`

### Task 5: Replace in app/contact/page.tsx
- `text-[#f0c16a]` → `text-gold-300`

### Task 6: Replace in components/CheckoutClient.tsx
- `border-[#3a2a20]` → `border-smoke-400`
- `bg-[#16100c]` → `bg-pit-card`
- `border-[#d8b56a]` → `border-gold-400`
- `ring-[#d8b56a]` → `ring-gold-400`
- `hover:border-[#b8893a]` → `hover:border-gold-600`

### Task 7: Replace in components/FrozenItemCard.tsx
- `border-[#3a2a20]` → `border-smoke-400`
- `bg-[#201510]` → `bg-pit-img`

### Task 8: Replace in components/MailingListSection.tsx
- `text-[#f0c16a]` → `text-gold-300`

### Task 9: Replace in components/NavBar.tsx
- `text-[#f0c16a]` → `text-gold-300`
- `hover:text-[#f0c16a]` → `hover:text-gold-300`
- `border-[#4a3222]` → `border-smoke-400`
- `bg-[#1c130f]` → `bg-pit-btn`
- `hover:border-[#b8893a]` → `hover:border-gold-600`

### Task 10: Replace in components/OrderLanding.tsx
- `text-[#f0c16a]` → `text-gold-300`
- `bg-[#120c09]` → `bg-pit-surface`

### Task 11: Replace in components/PackageCard.tsx
- `border-[#3a2a20]` → `border-smoke-400`
- `bg-[#201510]` → `bg-pit-img`

### Task 12: Replace in components/SoldOutCapture.tsx
- `text-[#f0c16a]` → `text-gold-300`

### Task 13: Replace in components/Testimonials.tsx
- `text-[#f0c16a]` → `text-gold-300`

### Task 14: Update public/code_review.md Issue 14 status to DONE

### Task 15: Commit all changes atomically
