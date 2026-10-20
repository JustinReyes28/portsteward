# PortSteward

Identify the actual process behind a busy development port, compare it with saved project profiles, and deliberately manage a server.

Windows-first, dependency-free Node.js terminal application. Former local codename: PortPilot. The implementation is an alpha for phase 4 validation; no public package or release has been published.

## Start without downloading packages

Tested locally with Node.js **25.2.1** and Windows PowerShell **5.1**. The package targets the tested Node 25 major. From this repository:

~~~powershell
node portpilot-app/src/cli.mjs --help
node portpilot-app/src/cli.mjs list --config .portsteward/registry.json
node portpilot-app/src/cli.mjs interactive --config .portsteward/registry.json
~~~

The application makes no internet requests. Node.js must already be installed; no npm install is necessary.

## Try two sample projects

~~~powershell
node portpilot-app/src/cli.mjs examples .portsteward/samples
node portpilot-app/src/cli.mjs profiles import .portsteward/samples/profiles.json --config .portsteward/registry.json
node portpilot-app/src/cli.mjs launch sample-web --config .portsteward/registry.json
node portpilot-app/src/cli.mjs launch sample-api --config .portsteward/registry.json
node portpilot-app/src/cli.mjs restart 3000 --config .portsteward/registry.json
~~~

Each process action displays a preview. Type the shown operation word to confirm. Check that ports 3000 and 4000 are free; these examples deliberately report a conflict rather than selecting different ports. Both profiles list 3000 to demonstrate configured ambiguity, while Sample API launches on 4000.

For scripts, --json provides structured output and --yes explicitly confirms the printed preview. Optional --pid and --start-time constrain stop/restart to an expected identity. Without confirmation, noninteractive process actions are refused.

## What works

- Projects: validated folders, expected ports, explicit executable/argument arrays, favorites, named groups and project filters.
- Ports/Details: live Windows TCP listeners, available identity/command details and textual ownership evidence. Configured ports alone do not prove ownership.
- Deliberate stop: single-use preview, immediate identity re-read, then creation-token/executable validation and termination through one retained Windows process handle.
- Managed launch/restart: launch without a shell, verify that the direct child owns the expected listener, and restart only the exact managed process using its original saved run definition.
- History and persistence: recent runs, failed launches and observed exits; atomic JSON writes, backup recovery, one-step persistent registry undo and profile-only import/export.
- Keyboard dashboard: Projects, Ports, Details and History; selection, forms, Esc cancellation, resize handling and light/dark heading accents.

Use --help for commands. Terminal keys: 1–4 or Tab for views; Up/Down select; Enter details; S/R preview stop/restart; Space refresh; F favorites; / project filter; G group filter; T theme; Q quit. Projects also supports A/E/D/L/V/U/I/X for add/edit/delete/launch/favorite/undo/import/export.

## Storage and boundaries

Default configuration is %LOCALAPPDATA%/PortSteward/registry.json. --config selects another path. Logs are beside the registry in logs/. Profile import never executes commands and never imports process authority. An edit changes future launches; restart uses the original run definition. Exported profiles contain local paths, so inspect them before sharing.

Stop is forceful Windows process termination after explicit confirmation, not a graceful application shutdown. It targets one process, not its descendants. Direct executable launches are supported. A wrapper such as npm that moves the listener into a different child does not qualify for managed readiness/restart; launch the actual server executable/script. No tree kill is inferred.

Process metadata can be unavailable under privilege restrictions. Unknown details remain unknown; verified native identity is required for stop. Other operating systems, automatic restarts, proxies and remote controls are outside the current support claim.

Preview cancellation changes nothing. Once a confirmed action starts, its observed outcome is reported; it is not rolled back by Esc. Closing the dashboard leaves deliberately launched servers running. Reopen and inspect before stopping them.

A writer lock protects registry updates. If a process crashes while holding the lock, verify that writer has exited before manually removing the named lock file. Unsupported schema versions are preserved. Corrupt primary files are preserved beside a recovered backup. Undo affects profile edits only.

## Verification

~~~powershell
node portpilot-app/scripts/check.mjs
node --test portpilot-app/test/portpilot.test.mjs portpilot-app/test/regression.test.mjs
node --test portpilot-app/test/windows.test.mjs
node portpilot-app/src/cli.mjs demo
~~~

The demo is explicitly simulated. The Windows integration test creates real isolated loopback servers, verifies native identity-mismatch refusal and managed restart while a second app stays available, then cleans up only its test processes.

[Build evidence](docs/PHASE-03-Build-and-Evidence.md) · [Execution status](docs/EXECUTION-STATUS.md) · [Architecture](docs/PHASE-02-Architecture.md) · [GitHub status](docs/GITHUB-STATUS.md)

## Plans and credit

[Product brief](docs/PHASE-01-Product-Brief.md) · [User stories](docs/USER-STORIES.md) · [All five phase plans](Project-Plans-2026-10-12.md) · [Provenance](docs/PROVENANCE.md)

[fkill-cli](https://github.com/sindresorhus/fkill-cli) inspired the original narrow process-management direction. This implementation uses the supplied original scaffold and new local code; no upstream source or assets were copied. The provenance record describes comparison tools without claiming these features are unprecedented.

The earlier Word handoffs are retained historical drafts. Their completion/support claims are superseded by the current Markdown evidence and test results. Phase 4 beta testing/release and phase 5 marketing remain future work. MIT license.
