# Technology Stack

**Analysis Date:** 2026-04-03

## Languages

**Primary:**
- TypeScript 5.5 - All source files (`app/`, `components/`, `lib/`)
- TSX - React component files (`components/**/*.tsx`, `app/**/*.tsx`)

**Secondary:**
- CSS - Global styles (`app/globals.css`)

**Excluded:**
- JavaScript allowed: `false` (`allowJs: false` in `tsconfig.json`)

## Runtime

**Environment:**
- Node.js v24.8.0

**Package Manager:**
- npm 11.12.1
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js ^16.1.6 - Full-stack React framework; App Router with Server Components and API Routes
- React 18.3.1 - UI rendering; used with `react-dom` 18.3.1
- React Strict Mode: enabled (`reactStrictMode: true` in `next.config.js`)

**Styling:**
- Tailwind CSS ^3.4.13 - Utility-first CSS
- PostCSS ^8.4.45 with Autoprefixer ^10.4.20 - CSS processing pipeline
- Config: `tailwind.config.ts`, `postcss.config.js`

**Validation:**
- Zod ^3.24.2 - Runtime schema validation for API request bodies

**Testing:**
- Vitest ^4.0.18 - Unit test runner
- Test environment: `node` (not jsdom)
- Config: `vitest.config.ts`

**Build/Dev:**
- TypeScript Compiler - via Next.js bundler (`moduleResolution: bundler`)
- Target: `ES2022`

## Key Dependencies

**Critical:**
- `next` ^16.1.6 - Application framework; drives routing, API routes, server rendering
- `zod` ^3.24.2 - Request validation at all API endpoints; central to input safety

**Infrastructure:**
- `next/font/google` - Google Fonts loaded at build time (Playfair Display, Source Sans 3)
- Node built-in `crypto.randomUUID()` - Used for idempotency keys and request IDs (no external package needed)

## Configuration

**Environment:**
- Configured via `.env.local` (present, not committed)
- Template documented at `.env.example`
- Loaded via `lib/env.ts` which validates and throws on missing required vars
- Required vars: `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_FROZEN_CATEGORY_ID`, `SQUARE_SAUCE_VARIATION_ID`
- Optional vars with defaults: `SQUARE_HOST` (defaults to `https://connect.squareup.com`), `SQUARE_ENV` (defaults to `sandbox`)

**Build:**
- `next.config.js` - Minimal config; strict mode enabled
- `tsconfig.json` - Strict TypeScript; ES2022 target; `vitest/globals` types included
- `tailwind.config.ts` - Custom `ember` (orange/red) and `smoke` (dark brown) color palettes; custom shadows and gradients

## API Routes

All API routes specify `export const runtime = "nodejs"`:
- `app/api/frozen-items/route.ts` - GET
- `app/api/checkout/route.ts` - POST
- `app/api/dev/set-inventory/route.ts` - POST (sandbox only)

## Platform Requirements

**Development:**
- Node.js 24.x
- npm 11.x
- Square sandbox credentials in `.env.local`

**Production:**
- Node.js-capable hosting (not edge-compatible; runtime explicitly set to `nodejs`)
- Square production credentials

---

*Stack analysis: 2026-04-03*
