# Activation boundary and remaining work

This is an initial, disabled release. Do not equate passing mocked tests or a
controlled Codex document edit with unattended production readiness.

- Dedicated account, directory ownership, administrator-owned release/config,
  repository-scoped GitHub grants, labels and lingering require host installation.
  The owner's desktop credentials were used only for authorized integration
  probes; they are not an unattended deployment configuration.
- The installed CLI is pinned by the deployment instructions, not downloaded by
  the orchestrator. Upgrades require rerunning probes and sandbox tests. No SDK
  was installed or necessary. There is no live-turn attach or universal resume
  guarantee, and no allowance polling endpoint is assumed.
- CLI error formats may evolve. Unknown errors stop or use bounded recovery;
  they never authorize a new provider or API billing. Provider reset extraction
  supports only explicit structured values. Approval requests are denied rather
  than answered with broader permissions.
- Site fonts are bundled under `app/fonts` and loaded locally; a clean production
  build has been verified with worker-style network isolation. Dependency
  installation still requires network access. A full supervised coding-worker
  validation remains required before enabling unattended implementation.
- GitHub issue/PR scans are capped at 200. A large backlog requires pagination
  before activation. PR deduplication recognizes linked body keywords and repo
  branch conventions, not every possible informal mention or external worker.
- GitHub Projects status/priority fields and native dependency APIs are not yet
  implemented. Use the documented labels and `Depends on #N` convention. No
  attached Project was found during verification.
- Acceptance evidence is model supplied and checks are deterministic, but an
  independent semantic reviewer is not implemented. The owner reviews every PR.
  Existing PR feedback is not processed automatically.
- Failed issues require operator inspection; no automatic repeated redispatch.
  Recovery after publishing a branch can stop on a non-fast-forward push rather
  than rewrite history. Resolve the branch interactively; force-push is absent.
- Decision entries are proposed through PRs. Automatic reuse/search of prior
  decisions depends on the worker reading repository documentation; no separate
  decision retrieval index is built.
- Audit/SQLite retention and external backups are operator policies. Journald
  retention is documented rather than silently changing machine configuration.
- Graceful shutdown/reboot reconciliation and failures are tested with mocks;
  rebooting the owner's machine and destructive fault injection were not done.
  Run a dedicated-host soak and fault-injection test before timer activation.

Security-control changes require owner approval of a reviewed PR/configuration.
No merge, deployment, production database, arbitrary repository or permission
expansion command is exposed by the CLI.
