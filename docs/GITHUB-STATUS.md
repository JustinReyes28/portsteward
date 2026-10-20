# Verified GitHub setup
Account: JustinReyes28, verified through the user's existing GitHub CLI keyring sign-in. The separate sandbox account did not have access; authenticated remote operations used the user account context without copying credentials.
Repository: https://github.com/JustinReyes28/portsteward
Current visibility: PUBLIC, changed at the user’s request on 20 October 2026. Initial phase 2 setup was private. Default branch: main.
No versioned GitHub release, npm publication or social post was made.

Planning/scaffold checkpoint: 997d9d9.
Complete implementation: 12bc27930caa7757dabd818536b176ec3abccde4, pushed to main.

Milestone issues created with concrete acceptance criteria and closed by the implementation commit:
- https://github.com/JustinReyes28/portsteward/issues/1 — live inspection
- https://github.com/JustinReyes28/portsteward/issues/2 — registry and ownership evidence
- https://github.com/JustinReyes28/portsteward/issues/3 — deliberate control
- https://github.com/JustinReyes28/portsteward/issues/4 — daily use/recovery

Windows CI run: https://github.com/JustinReyes28/portsteward/actions/runs/39391307911
Final CI outcome is recorded below. The concluding documentation commit uploads all evidence and completion records; its commit/tree identity is checked against GitHub after push.

CI runs on a GitHub-hosted Windows runner. Action and runtime downloads occur there; no package install is used on this workstation. Workflow action revisions were read from their official GitHub refs and pinned by SHA.

Verified CI outcome: SUCCESS for implementation commit 12bc27930caa7757dabd818536b176ec3abccde4; Windows job completed 2026-10-20T08:09:30Z. Syntax, 27 automated tests and the real Windows workflow all succeeded.

Public sharing: GitHub reported visibility PUBLIC and an anonymous, config-disabled HTTP HEAD request to the repository returned 200. Description and topics reflect the Windows alpha. The tracked-history credential-pattern scan covered 88 objects and found no matches; the historical Word files had no embedded media. This is a scoped review, not a guarantee that every possible secret format can be detected.

Press kit: ../press/README.md. Reddit/LinkedIn/X drafts, two original illustrated PNG cards, facts, alt text and a 30-second demo plan are prepared. No social account was used to submit a post.
