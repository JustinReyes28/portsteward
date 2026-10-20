# Phase 3: implementation and evidence
Executed 20 October 2026, Asia/Singapore. Product: PortSteward; local folder codename: PortPilot.

Implementation commit: [12bc279](https://github.com/JustinReyes28/portsteward/commit/12bc27930caa7757dabd818536b176ec3abccde4).
The repository is under the verified account JustinReyes28; current visibility is recorded in GITHUB-STATUS.md. This is an alpha handoff to phase 4, not a public release or completed beta.

## Milestone 1: read-only live view
[Issue 1](https://github.com/JustinReyes28/portsteward/issues/1), closed by the implementation commit.
Windows netstat supplies actual TCP listeners; native process handles supply creation tokens and executable paths. Optional CIM command details remain unavailable when denied. Discovery failure is visible rather than a false empty result.
Evidence: test/windows.test.mjs observes an actual loopback server's port/PID. Deterministic tests cover inaccessible identity. Regression tests cover discovery failure, multiple listener identities and terminal recovery.

## Milestone 2: project awareness
[Issue 2](https://github.com/JustinReyes28/portsteward/issues/2), same implementation commit.
Projects stores validated profiles, executable/argument arrays, expected ports, favorites and group labels. Ownership evaluation distinguishes exact-managed, path-and-port, port-only, ambiguous-conflict, unmatched and access-denied. Port-only matches list configured candidates without naming a verified owner. Shared expectations remain visible alongside the actual listener.
Evidence: deterministic two-project conflicts, path-boundary/UNC tests, import/undo tests, and two real project folders containing spaces in the Windows workflow.

## Milestone 3: deliberate control
[Issue 3](https://github.com/JustinReyes28/portsteward/issues/3), same implementation commit.
S and R display full stop/restart previews; L displays the explicit saved launch definition. The terminal requires a typed operation word. CLI scripts require explicit --yes; previews are printed separately from JSON results.
Previews are single-use, cancellable and expiring. The supervisor re-reads identity. The Windows helper opens one handle, checks its creation token and executable, terminates through that same handle and waits for observed exit.
Launch success requires the expected listener to belong to the direct child. Exact-managed restart uses the original run definition and never infers a command for an unrelated process.
Evidence: fake PID-reuse before action and between revalidation/action; native wrong-token refusal against a real live server; no-confirmation CLI launch refusal; real cross-invocation launch/restart; edited-profile restart tests; second sample API remains responsive throughout the first app's restart.

## Milestone 4: daily use
[Issue 4](https://github.com/JustinReyes28/portsteward/issues/4), same implementation commit.
Favorites/groups, project filters, recent runs, occupied-port guards, missing-executable messages, observed child exit, profile-only import/export, persisted one-step edit undo, writer locking, fsynced atomic replacement and validated backup recovery are implemented.
Malformed import validation completes before writing. Unknown schema versions remain intact. Profile import does not import managed history or run commands.
If launch history cannot be saved, cleanup targets the newly launched identity. If a process was stopped but history saving fails, the result states that the stop occurred and a restart is refused. If primary storage commits but backup saving fails, the error explicitly reports the committed primary.
Keyboard navigation, edit forms, Esc cancellation, complete previews, selected-row visibility, resize, themes and initial discovery recovery are covered by terminal event tests.

## Three product differences and their evidence
1. Project registry: Projects view, src/domain.mjs and src/storage.mjs; issue 2; commit 12bc279; persisted two-profile and import/undo tests.
2. Observed ownership evidence: Ports/Details views, evaluateObservationOwnership; issues 1–2; commit 12bc279; actual external listener separated from two shared-port configurations.
3. Managed launch/restart: Projects launch preview, Ports restart preview and History; src/supervisor.mjs and native Windows helper; issue 3; commit 12bc279; real restart changes the web PID and leaves the API PID unchanged.

## Reproduce the core journey
From the repository root:
~~~powershell
node portpilot-app/src/cli.mjs examples .portsteward/samples
node portpilot-app/src/cli.mjs profiles import .portsteward/samples/profiles.json --config .portsteward/registry.json
node portpilot-app/src/cli.mjs interactive --config .portsteward/registry.json
~~~
Register/import two sample apps; inspect the configured conflict on 3000 and actual listener; select and preview any intended stop; launch Sample Web and Sample API from their profiles; restart only Sample Web on 3000. Confirm each action explicitly. Occupied ports are reported; choose/edit the saved fixture arguments if these example ports are already in use.

The automated Windows test performs that journey with fresh ephemeral loopback ports, an external test listener, two original sample apps and an isolated temporary user-data directory. It verifies HTTP responses/PIDs and cleans up only its own known identities.

## Verification records
- [Unit and interaction tests](evidence/unit-tests.txt): 27 passing, including the original seven repaired acceptance tests.
- [Real Windows journey](evidence/windows-tests.txt): 1 passing, with actual port/PID diagnostics and native mismatch refusal.
- [Syntax check](evidence/syntax.txt): all shipped/test JavaScript modules checked.
- [Six terminal states](evidence/terminal-states.txt): rendered original sample content.
- [Simulated walkthrough](evidence/simulated-walkthrough.txt): explicitly fake adapter; it is not live process-control proof.
- [Performance baseline](evidence/performance.json): fresh CLI startup, real listener refresh and source package bytes; installed runtimes are excluded.
- [Windows CI](https://github.com/JustinReyes28/portsteward/actions/runs/39391307911): implementation commit's remote check; final conclusion is recorded in GITHUB-STATUS.md.

## Working, partial and deferred
Working on the recorded Windows host: the four milestones, CLI commands and interactive keyboard workflow above.
Partially validated: broader Windows builds, standard-user versus elevated deployment combinations, long-running use and unassisted participant usability. These are phase 4 validation tasks; no broad cross-platform claim is made.
Deferred: npm publication/binary packaging, versioned public release, external beta interviews, package-script import, child-tree management, remote control, background daemon and marketing.

## Phase 4 handoff
Supported evidence: Node.js 25.2.1, Windows_NT 10.0.26200 x64, PowerShell 5.1. Package targets the tested Node 25 major.
Known limits: forceful direct-process termination; no inferred descendant control; wrappers whose listener is a different PID fail readiness; optional process details may be unavailable; crashed writer locks require verified manual recovery; confirmed actions cannot be cancelled once executing.
Beta task: "Register two sample apps, identify an occupied port, launch one from its profile, and restart only that managed server."
Suggested 3–5 external participants remain pending. Preserve the phase 4 release gate; do not count these developer-run tests as unassisted beta completion.
