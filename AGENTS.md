# AGENTS.md

Instructions for AI coding agents (Codex, Claude Code, etc.) working in this repo.
Claude Code also reads `CLAUDE.md`, which contains the same workflow rules plus
project architecture notes.

## Commands

```bash
npm run lint    # ESLint
npm run build   # Production build (needs env vars — see .env.example)
npm test        # Vitest, single run
```

CI runs all three on every PR. All must pass before a PR is ready for review.

## Branching & PR Workflow

1. Work starts from a GitHub issue. Comment on the issue with the branch name
   so other agents don't pick up the same work.
2. Branch off `master`, named `<agent>/<issue-number>-<short-slug>`:
   - Codex: `codex/42-fix-cart-total`
   - Claude Code: `claude/42-fix-cart-total`
3. Commit and push to that branch freely. Never push to `master` directly.
4. Commit messages: conventional prefix (`feat:`, `fix:`, `docs:`, `chore:`,
   `refactor:`), one short line. Anything longer than a couple of sentences
   gets skipped over.
5. Before opening a PR: rebase on latest `master`, run lint/build/test locally,
   confirm the diff only touches what the issue asks for.
6. Open the PR with `Closes #<n>` in the body (template is in
   `.github/pull_request_template.md`) and request review from `Yamatoberu`.
7. `Yamatoberu` reviews, approves, and merges. Answer review questions in the
   PR thread. Push follow-up commits to the same branch — do not force-push
   once a PR is open.
