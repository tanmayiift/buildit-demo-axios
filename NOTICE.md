# NOTICE — snapshot provenance

This repository is an **unmodified-at-import snapshot of an upstream open-source
project**, republished only as review evidence for BuildIT. It is **not
affiliated with, endorsed by, or maintained by** the upstream project or its
authors. Do not depend on it; use the upstream project instead.

| Field | Value |
| --- | --- |
| Upstream project | https://github.com/axios/axios |
| Upstream licence | MIT (see the licence file kept at the repository root) |
| Pinned tag | `v1.20.0` |
| Pinned commit | `84a9f3b9a4f3244b8c8e818f557d64c7b964fb25` |
| Snapshot taken | 2026-09-05 |

All files that came from upstream remain under the upstream licence and the
upstream copyright holders. Nothing here changes those terms.

## Deviations from the pinned upstream tree

The upstream *test fixture* private key `tests/unit/adapters/key.pem` was
deleted before the initial commit so that GitHub secret-scanning push protection
would accept the snapshot. It is a throwaway self-signed key; the matching
`cert.pem` was kept. Tests that start a local HTTPS server will not run against
this snapshot without regenerating it.

Any further change lives on a branch and in its pull request, never on
`main`. `main` is the snapshot.
