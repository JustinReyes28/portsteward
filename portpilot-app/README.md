# PortSteward alpha
Dependency-free Windows project-aware TCP port inspection and deliberate server control.

From this directory, use:
~~~powershell
node src/cli.mjs --help
node src/cli.mjs interactive
node scripts/check.mjs
node --test test/portpilot.test.mjs test/regression.test.mjs
node --test test/windows.test.mjs
~~~
No npm install is required. Tested Node.js 25.2.1 / Windows PowerShell 5.1.
Application use makes no internet requests. Inspect the complete action preview and confirm deliberately. Managed readiness/restart requires the launched direct process to own its configured listener. Stop uses forceful Windows termination, targets one process and does not kill descendants.

[Full documentation and limitations](../README.md) · [Implementation evidence](../docs/PHASE-03-Build-and-Evidence.md) · [Provenance](../docs/PROVENANCE.md)
This is an alpha for phase 4 validation; no public package has been published. fkill-cli is inspiration only; no upstream source was copied. MIT license.
