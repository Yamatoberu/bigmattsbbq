# Verification record — 2026-11-19

Tracking issue: [#63](https://github.com/Yamatoberu/bigmattsbbq/issues/63).
Implementation branch: `codex/63-agent-orchestrator`, isolated from the owner's
pre-existing dirty checkout and branched from `master`.

## Prerequisites actually checked

| Prerequisite | Observed result |
| --- | --- |
| OS | Linux Mint 22.3, Ubuntu noble base |
| Git | 2.43.0 |
| systemd | 255; user manager running |
| Initial shell | Node 22.23.5/npm 10.9.9; does not meet repository pin |
| Verification toolchain | Temporary Node 24.22.3 and npm 11.21.1, installed outside the source checkout |
| Codex | Standalone CLI 0.171.0, ChatGPT login; includes code-mode host and exec-server helpers |
| Codex SDK | Not installed in inspected global npm packages or repository; no SDK dependency added |
| GitHub CLI | Authenticated `/user` login is `BigMatt-Agents`, ID 331418061 |
| Git transport | Actual credential-helper token checked against `/user` without printing it; login `BigMatt-Agents`; `ls-remote` and fetch succeeded |
| Repository | Read/push/triage true; admin and maintain false |
| Projects | Repository Projects query succeeded; no attached Projects returned |
| Commit identity | Isolated branch configured as `BigMatt-Agents`, `331418061+BigMatt-Agents@users.noreply.github.com` |
| Namespace sandbox | Bubblewrap executes successfully on this host |
| Implemented diagnostics | Node, GitHub, Git transport, Codex, systemd and sandbox all report OK |

The initial sandbox disallowed network, loopback binds and temporary executable
fixtures. Narrowly approved host executions were used for live GitHub/Codex
checks, the existing transport tests and fake CLI tests. No authentication
failure was bypassed and no alternative inference service was introduced.

## Live subscription and recovery proof

1. Removed `OPENAI_API_KEY` and `CODEX_API_KEY` from the first probe environment,
   forced ChatGPT login, selected the default OpenAI provider, disabled approvals,
   and used a read-only no-tool prompt. It returned the exact expected marker.
2. The CLI emitted `thread.started`, `turn.started`, an agent message and
   `turn.completed`. Original session `01a1f723-5b73-7811-bfb5-5dc2eb84f1a1`
   successfully resumed by explicit ID and returned the resume marker.
3. The implemented CLI repeated both operations with SQLite persistence outside
   the repo. Session `01a1f72d-a6e1-7901-90fe-85b444e2f8c5` survived CLI exit and
   was resumed by `probe --resume`.
4. A transient systemd service ran that implemented resume command after its
   launcher exited. Its journal recorded successful resumption at 21:27:19 local
   journal time. The hourly timer and permanent units were not installed/enabled.
5. A controlled coding task for #63 created
   [CONTROLLED-PROOF.md](CONTROLLED-PROOF.md) inside the isolated worktree.
   Session `01a1f72f-9cb3-72c0-a958-38798e1628cb` was resumed after correcting
   the sandbox's `/bin` mount and companion-binary mount. Restrictions were
   preserved throughout; no unrestricted fallback was used.
6. That same session then returned a schema-conforming result after testing
   credential readability without reading contents: `/codex-home/auth.json`
   unreadable, host `/home/mgregory` absent, Node v24.22.3. The live controlled
   session ID and verification timestamp were stored in the external SQLite DB.

These executions used ChatGPT authentication, no API key, no API client and no
billable inference fallback. A local CLI check cannot independently audit the
owner's billing ledger or credit-purchase settings. No claim of unlimited
subscription allowance or guaranteed live-turn attachment is made.

## Checks

- Clean lockfile installation in the isolated worktree with package scripts disabled.
- `npm run lint`: passes; seven existing application warnings, no errors.
- `npm run build`: passes on Node 24 with the same dummy variables as CI and font-download network access.
- `npm test`: 439 tests pass across 39 files, including local transport tests.
- Orchestrator TypeScript build: passes.
- 50 orchestrator tests pass across three files. Reliability tests cover SQLite concurrency, locks, reboot/process identity,
  active/unknown supervisor handling, expired heartbeats, usage backoff,
  explicit session resume, interrupted event streams, auth and permission errors,
  dependency/readiness blocking, technical/business questions, bounded corrective
  work, successful PR flow and PR creation failures. Fake providers consume no
  subscription allowance.
- `systemd-analyze --user verify`: passes for temporary copies substituting the
  installed Node executable for the documented `/opt` deployment path. The
  uninstalled template naturally reports that its `/opt` executable is absent.
- Status, pause and resume commands exercised with private external runtime state;
  dispatch remains disabled.
- Initial hosted CI exposed a fake-CLI fixture that hardcoded `/usr/bin/node`.
  Hiding that interpreter in a namespace reproduced the exact eight failures;
  using the selected `process.execPath` fixed the fixture without changing runtime
  security. The same namespace reproduction and all 50 tests then pass.

## Boundaries of this proof

The controlled Codex document change is included in this issue's PR. GitHub
push/PR publication is performed by the verified agent identity after required
checks. This proves the subscription-to-code-to-PR integration with supervised
probe execution; it is **not** a full unattended backlog or host-reboot soak.
The entire coding worker has mocked lifecycle tests, while only its isolated
Codex execution boundary was exercised live. Do not activate the timer until the
dedicated-account setup, offline font build and a full supervised coding issue
have been validated. See [remaining limitations](LIMITATIONS.md).
