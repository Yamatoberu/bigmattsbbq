# Issue 24: Square MCP trusted origins

User approved all six recommendations after discussion. Keep changes in the
standalone MCP package; application configuration remediation remains in #22.

1. Require explicit sandbox/production configuration; derive the official HTTPS
   origin and reject any non-exact optional host override before startup.
2. Validate runtime arguments and rooted /v2/ API paths, preserving queries and
   encoded resource identifiers. Reject malformed paths, authority tricks,
   traversal, unsafe headers, unsupported methods, and invalid bodies before fetch.
3. Compare the parsed origin before attaching credentials and reject all redirects.
4. Extend actual stdio tests with synthetic credentials and intercepted fetch;
   document configuration migration, restart, and verification limitations.
5. Run package tests plus root lint/build/test, inspect the focused diff, and
   submit a PR for Yamatoberu with SEC-04 evidence recorded in #19.
