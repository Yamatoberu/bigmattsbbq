# Deferred Items — quick task 260904-uyl

## `npm run lint` is broken, independent of this task

Running `npm run lint` prints:

```
Invalid project directory provided, no such directory: /home/mgregory/Development/bigmattsbbq/lint
```

Confirmed via `git stash` against the pre-task commit (`ca64411`'s parent state)
that this failure is pre-existing and reproduces identically with none of this
task's changes applied. Root cause appears to be a `next lint` / Next.js 16 CLI
argument-parsing mismatch, unrelated to any file touched by quick task 260904-uyl
(`lib/timezone.ts`, `lib/drops.ts`, `lib/types.ts`, `lib/database.types.ts`,
`components/CheckoutClient.tsx`, `app/api/checkout/route.ts`, the two new
migrations, and the affected test files).

Left unfixed per the executor's scope-boundary rule (only auto-fix issues
directly caused by the current task's changes). Not required by any of this
task's four `<done>` criteria, none of which mention `npm run lint`.

**Status:** out of scope, unresolved, tracked here for the next task/phase that
touches build tooling.
