# Big Matt's BBQ agent orchestrator

Local TypeScript orchestration for `Yamatoberu/bigmattsbbq`, with one independent
systemd coding worker and ChatGPT-authenticated Codex CLI inference. No OpenAI API
client, API key, Agents API, inference gateway, merge, or deployment path exists.

**Dispatch is disabled in the example configuration.** Review the verification
record and limitations before enabling unattended work. Installing the files does
not enable the timer. This initial release is a gated implementation, not a claim
that production operation has been validated.

## Build and test

Use the repository's Node 24.x and npm 11.21.1. Install dependencies with `npm ci`
at the repository root; the tool has no additional runtime dependencies. SQLite
uses Node's built-in `node:sqlite`.

```bash
npm --prefix tools/agent-orchestrator run build
npm --prefix tools/agent-orchestrator test
node tools/agent-orchestrator/dist/cli.js --config /absolute/path/config.json diagnostics
```

Keep `migrations/` beside `dist/` when copying a release. The root CI also builds
and tests this tool. SQLite migrations run transactionally, once per version.

## Host installation

Use a **dedicated unprivileged Linux account** with no sudo access, production
credentials, production checkout, SSH agent forwarding, or personal GitHub login.
Do not point an unattended install at the owner's desktop home or existing
credential directory. Linux namespaces and `bubblewrap` are required; a failed
sandbox check must be fixed rather than bypassed.

Provision these paths for the account (example account `bbq-agent`):

| Path | Contents | Permissions |
| --- | --- | --- |
| `/opt/bbq-agent/release` | Reviewed source plus built `dist/` and migrations | Administrator owned, worker read only |
| `/opt/bbq-agent/bin/` | Pinned Codex 0.171.0 binaries: `codex`, `codex-code-mode-host`, `codex-exec-server` | Administrator owned, executable |
| `/opt/bbq-agent/toolchain` | `npm install --prefix PATH node@24 npm@11.21.1` | Administrator owned, read only |
| `/srv/bbq-agent/repository` | Dedicated clone of this repository | Worker owned |
| `/var/lib/bbq-agent` | External state, worktrees, Codex and gh authentication | Worker owned, mode 0700 |
| `/etc/bbq-agent/config.json` | Copy of `config/example.json` | Administrator owned, readable by worker |

Set configuration paths to match the actual host. `stateDirectory` must be outside
the source checkout. Never store state, tokens, auth.json, or application `.env`
files in Git. Back up SQLite with SQLite's backup API or while services are
stopped; preserve the WAL along with the database if copying a live database.

## Authentication

As the dedicated account, authenticate Codex interactively with the owner's
ChatGPT subscription, **not an API key**:

```bash
CODEX_HOME=/var/lib/bbq-agent/codex /opt/bbq-agent/bin/codex login --device-auth
CODEX_HOME=/var/lib/bbq-agent/codex /opt/bbq-agent/bin/codex login status
GH_CONFIG_DIR=/var/lib/bbq-agent/gh gh auth login --hostname github.com --git-protocol https --web
GH_CONFIG_DIR=/var/lib/bbq-agent/gh gh api user --jq .login
```

The GitHub browser login must be **BigMatt-Agents**. Stop if it prints any other
identity. Grant a repository-scoped fine-grained token access only to
`Yamatoberu/bigmattsbbq`: metadata read, contents read/write, issues read/write,
and pull requests read/write. Do not grant administration or Actions secrets.
The existing credential was verified as having repository push/read access;
its exact token grant configuration is not inspectable here. Branch protection
must leave merging to Yamatoberu. If the organization requires token approval,
the owner must approve the token; do not substitute personal credentials.

Git commands explicitly select the gh credential helper and agent commit author.
The transport credential is separately checked against `/user` before writes.
Never put tokens in remote URLs, systemd units, config JSON, or command arguments.

Create labels `ready-for-agent`, `agent-blocked`, `awaiting-owner-input` and
optionally `priority:p0` through `priority:p3` before activation. Label management
is intentionally not automatic. Resolve missing repository permissions through
the owner; do not silently broaden grants.

## Commands

Every command takes `--config /absolute/path/config.json`:

| Command | Behavior |
| --- | --- |
| `diagnostics` | Checks runtime, CLI and transport identity, subscription auth, systemd and namespace availability |
| `probe` | Runs a no-tool subscription task and persists its exact session ID in SQLite |
| `probe --resume` | Resumes that exact persisted probe session |
| `status` | Prints execution, usage/retry, question, session and PR records |
| `wake --dry-run` | Reconciles without GitHub writes, dispatch, or execution state updates; briefly takes a local lock |
| `wake` | Reconciles, recovers existing work, or launches one eligible issue |
| `dispatch 123` | Considers exactly #123, subject to the same gates and readiness rules |
| `pause` | Prevents new work and recovery; a running worker may finish |
| `drain` | Prevents new issues; permits current work to recover and finish |
| `resume` | Clears pause and drain; does not override configuration dispatch gates |
| `clear-circuit` | Rechecks identities/auth before clearing an operator circuit breaker |
| `worker UUID` | Internal systemd entry point; not a general shell command runner |

`enabled` and `integrationVerified` must both be true to start or resume workers.
Only the owner should change these controls after reviewing a concrete controlled
PR and the host sandbox. `approvedSecurityIssues` defaults to empty. An owner may
explicitly list an issue there to allow that issue's PR to change orchestration,
CI, agent instructions or package controls. Credentials remain forbidden even
for such issues. The model cannot edit the deployed configuration or release.

## Scheduling

Copy the reviewed units in `systemd/` to the dedicated account's
`~/.config/systemd/user/`. Paths in the units assume the layout above.

```bash
systemctl --user daemon-reload
systemd-analyze --user verify ~/.config/systemd/user/bbq-agent-*.service ~/.config/systemd/user/bbq-agent-orchestrator.timer
# Run diagnostics, probes and a controlled issue before enabling dispatch.
systemctl --user start bbq-agent-orchestrator.service
# Owner activation only, after reviewing configuration and verification evidence:
systemctl --user enable --now bbq-agent-orchestrator.timer
systemctl --user list-timers
journalctl --user -u bbq-agent-orchestrator.service --since today
```

An administrator must enable lingering (`loginctl enable-linger bbq-agent`) for
startup without an interactive login after reboot. The timer first wakes five
minutes after boot, then every six hours. The oneshot orchestrator exits after
starting the separate worker service. Worker
services do not depend on the orchestrator service and survive its exit. Worker
`Restart=no` deliberately defers retries to persisted reconciliation policy.

Use `systemctl --user stop bbq-agent-worker@UUID.service` for a graceful stop.
SIGTERM saves interrupted status where possible; systemd kills the whole control
group after 45 seconds. Even SIGKILL or reboot leaves the last SQLite checkpoint
recoverable on the next wake. To halt all activity, pause first, stop the worker,
then stop the timer. Do not delete worktrees or session files to restart a task.

Configure host journald retention explicitly, for example a bounded 100 MiB
`SystemMaxUse` and 30-day `MaxRetentionSec` in an administrator-reviewed journald
drop-in. This tool emits metadata only; provider event bodies and credentials are
not streamed into journald. Runtime session files remain private to the account.

## Backlog and owner decisions

The initial policy requires `ready-for-agent` and explicit acceptance criteria.
Priority is `priority:p0` first through `priority:p3`, then unlabeled issues;
ties use oldest creation time and issue number. There are no attached GitHub
Projects in the verified repository. Project status/priority integration remains
a documented extension, not a silently assumed fallback to arbitrary fields.

Write dependencies as `Depends on #123` or `Blocked by #123`. All must be closed.
Blocked/unclear issues get a concise comment and label, and other issues are
considered. Update the issue and remove `agent-blocked` to re-evaluate. An issue
with an existing execution is not automatically recreated after failure; inspect
and resolve it manually rather than spending unlimited allowance. Lists are
bounded at 200 issues/PRs; see the limitations record for large-backlog behavior.

The worker examines repository context and makes routine technical decisions.
A technical question gets one additional reasoning pass on the same subscription
session. Unresolved questions receive a structured GitHub comment. Only a comment
by **Yamatoberu** whose first line exactly matches the comment's
`agent-answer:EXECUTION_UUID:QUESTION_UUID` marker is accepted as
an owner answer. The answer remains task data, not permission to merge, deploy,
read credentials or change controls. Business questions release the coding slot
so they do not stall the backlog. Answer records are stored in SQLite and written
to `docs/agent-decisions/` in the implementation PR for human review.

## Recovery and troubleshooting

SQLite records the issue, execution UUID, supervisor unit, worktree, branch,
session, progress, heartbeat, timestamps, retries, reset estimate, errors,
questions, answers and PR. SQLite is authoritative for leases; systemd is
authoritative for whether a worker is supervised. A stale heartbeat alone never
replaces a running unit. Unknown supervisor state fails closed.

Usage errors pause the existing session. A structured `resets_at` value is used
when emitted; otherwise retry delays are 1, 2, 4 hours (bounded at 24 hours), with
three retries by default. Reset times are not guaranteed by CLI events. Generic
429s, network errors and authentication failures are distinct. Authentication,
approval and permission failures open a circuit. Use diagnostics, fix the cause,
then explicitly clear it. Retry exhaustion stops the issue instead of starting a
fresh session. Only an explicitly classified missing/corrupt session permits a
replacement session, using the same branch, acceptance criteria and checkpoint.

When PR creation fails, the pushed branch and session remain recorded. On the
next wake, a PR that was created before a crash is recovered by branch. No PR is
ever merged by the tool. The first release does not process PR review feedback
automatically; follow-up review remains a human/interactive agent workflow.

See [architecture](docs/ARCHITECTURE.md), [verification](docs/VERIFICATION.md), and
[remaining limitations](docs/LIMITATIONS.md) for the precise implementation and
activation boundary.
