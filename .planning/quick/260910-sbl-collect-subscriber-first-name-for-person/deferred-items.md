# Deferred Items — Quick Task 260910-sbl

## Out-of-scope discovery: `npm run lint` is broken repo-wide (pre-existing)

- **Found during:** post-implementation verification pass
- **Symptom:** `npm run lint` (`next lint`) fails with `Invalid project directory provided, no such directory: <repo>/lint` regardless of any file changes in this plan.
- **Reproduction:** `npx next lint` (no args) fails identically on an unmodified checkout.
- **Root cause:** Next.js 16.1.6 deprecated/changed the `next lint` command's argument handling, and this repo has no ESLint config file (confirmed by CLAUDE.md: "No ESLint config file present; `next lint` is available in scripts but no custom rules configured").
- **Why not fixed here:** Not caused by any file this plan touches (`app/api/mailing-list/route.ts`, `components/MailingListSection.tsx`, `components/SoldOutCapture.tsx`, `emails/DropNotificationEmail.tsx`, or their tests). Fixing it would require adding an ESLint config or pinning a different lint invocation — an architectural/tooling change out of scope for this quick task (Rule 4).
- **Status:** Deferred. `npx tsc --noEmit` and `npm run build` (both specified in the plan's own `<verification>` section) pass clean and serve as the type/build safety net in lint's absence.
