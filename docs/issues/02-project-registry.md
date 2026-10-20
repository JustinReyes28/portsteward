Implement versioned project profiles and ownership evidence.

Acceptance:
- Add/edit/delete profiles with absolute folders, expected ports and explicit executable/argument arrays.
- Persist Windows paths with spaces and preserve literal argument boundaries.
- Distinguish port-only expectations, path evidence, ambiguous conflicts and exact managed runs.
- Filter by project and preserve all shared-port claimants.

Evidence: portpilot-app/src/domain.mjs, storage.mjs, supervisor.mjs; deterministic and real-server tests.
