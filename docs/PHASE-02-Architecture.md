# Interaction and architecture
Decision date: 20 October 2026, Asia/Singapore.

## Supported baseline and dependencies
Windows-first. Node.js v25.2.1 and Windows PowerShell 5.1 are the locally tested baseline; package engines are pinned to the tested Node major. No third-party runtime, build or test packages. React/Ink and TypeScript were proposals, replaced with Node readline and native JavaScript to avoid installation while implementing the full interaction. No remote calls during application use.

## Components
- src/domain.mjs: profile validation and ownership evidence.
- src/storage.mjs: schema 1 profiles, managed history, persisted edit undo, lock-protected atomic JSON writes and backup recovery.
- src/adapters.mjs: deterministic fake adapter and Windows adapter.
- src/windows-process.ps1: local JSON protocol and retained Win32 handles.
- src/supervisor.mjs: preview tokens, managed-run rules, launch/readiness/restart.
- src/ui.mjs and src/interactive.mjs: terminal views, focus, keyboard actions and confirmation.
- src/cli.mjs: explicit commands and JSON output; never treats a noninteractive invocation as a confirmed stop.
- test/: deterministic boundary tests and real Windows loopback integration.
- examples/: two zero-dependency Node HTTP sample servers.

## Records
Project: id, name, absolute rootPath, expectedPorts[], launchExecutable, launchArgs[] (strings), favorite, group, createdAt, updatedAt.
Observation: address, TCP port, PID, opaque processStartTime token, command/executable when readable, observedAt and accessDenied.
ManagedRun: unique runId, projectId/name, PID, opaque start token, actual executable, original executable/args/root/port, status, timestamps, lastError and logPath.
Preview: unique single-use capability stored in memory, exact observed identity, port/address, managed run and saved launch snapshot. Confirmations expire and are invalidated after action, cancel, navigation or refresh.
Imported profiles contain no live authority. History is not imported. A configured port or edited project does not grant ownership.

## Process control invariant
Query creation time and executable through an opened Windows process handle. Before stopping, re-read observed identity. The stop helper opens a handle with query/terminate/synchronize rights, compares its creation token and executable to the preview, and uses that SAME handle for TerminateProcess and WaitForSingleObject. It never validates a PID then independently kills by PID. Failed checks preserve inspection and refuse mutation. Restart requires an exact managed identity and uses the original run command. Direct children only: a wrapper that delegates its listener to a descendant does not qualify as a verified managed listener in v1; no tree-kill is inferred.

## Persistence
Default: %LOCALAPPDATA%/PortSteward/registry.json. --config overrides it. Log files live beside the registry under logs/.
Schema 1. Reject unknown schema versions without overwriting them. Validate all profile input before mutation; reject duplicates and malformed arrays.
Use exclusive lock creation for each read/modify/write. A temp file is fsynced then renamed; the last validated complete state is mirrored to .bak. Invalid primary state is quarantined before backup recovery. Do not automatically remove a live or unverified lock.
One-step project-list undo is persisted separately from managed history and never reverts running processes.
Export only profiles. Import merges by default; replacement is explicit. Import changes profiles only and never runs commands. A later launch requires preview/confirmation.

## Interaction specification
Four views: Projects, Ports, Details, History. Start on Ports. 1–4 switch view; Up/Down select; Tab cycles view; F filters favorites; G prompts a group filter; / prompts project filter; Space refreshes; T toggles theme; Q/Ctrl+C exits. Selection stays visible when terminal height changes.
Projects: A add, E edit, D delete with confirmation, L preview launch, V favorite, U undo, I import, X export.
Ports: Enter details, S preview stop, R preview managed restart. Details can wrap/scroll long commands so the full identity is inspectable.
Confirmation requires typing the shown operation word, never a default Enter. Esc cancels and returns to prior selection with no mutation. Profile forms retain prior values; blank answers keep them, and cancel discards the draft.
Loading: show the operation while local discovery runs; ignore duplicate keys. Failure: show observed error with recovery action. Cancelled: show no operation performed. Completed: report only observed outcomes, not mere command submission.
Empty: explain no profiles/listeners/runs and expose the relevant next action. Normal: show all evidence labels in text; no meaning depends only on color.
Themes: default terminal colors in plain mode; optional high-contrast light/dark heading accents. No animation, downloads, embedded fonts or images. Non-TTY uses a static view; commands provide --json for scripts.
Below 40 columns or 10 rows show a resize hint; never truncate a destructive confirmation silently. Refresh is manual, avoiding persistent polling and needless process discovery.

## State sketches
Normal: header -> selected list row -> observed evidence -> action hints.
Empty: header -> no saved profiles -> A/Add instructions.
Loading: retained view -> "Reading local listeners..." -> actions temporarily unavailable.
Failure: retained selection -> error/recovery message -> refresh or cancel.
Cancelled: previous view/selection -> "Cancelled; no process changed."
Completed: refreshed observed state -> result message -> history row if a launch occurred.
Edit draft and confirmation are transient; returning to a list does not save a draft. Persist only a validated submission.

## GitHub and phase gates
One private development repository under the authenticated user's selected owner; public release belongs to phase 4. Keep source, all five plans, license, provenance, evidence and original examples. Ignore local config/logs, dependencies and machine-specific data.
Use milestone issues for live inspection, registry/evidence, deliberate control, and daily usability. Record commits and verified remote URLs in GITHUB-STATUS.md. GitHub authentication/owner must be verified; no URL or issue number is invented.
Configure offline syntax/unit checks and Windows integration in CI; GitHub runners download their own action/runtime files, not through this machine's cellular connection.
Measure initial/current CLI startup, listener refresh and source footprint on this named host; keep samples and measurement method in evidence/performance.json rather than inventing targets.
