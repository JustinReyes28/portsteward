# Provenance and comparison
Checked 20 October 2026. Source links describe observations, not endorsements. No repository was cloned and no package was installed.

## Source register
- fkill-cli: https://github.com/sindresorhus/fkill-cli . Inspiration only, no code/assets reused. Its README documents killing by process ID, name or port and interactive selection. MIT upstream license applies to upstream source, which is not distributed here.
- kill-port: https://github.com/tiaanduplessis/kill-port . Comparison only. Its README documents TCP/UDP port termination as a library/CLI workflow.
- Existing PortPilot TUI: https://github.com/AbdullahTarakji/portpilot . Comparison/name conflict only. Its README documents port inspection, filtering, conflicts, service groups and termination.
- Existing PortPilot project runner: https://portpilot.dev/docs/quick-start . Comparison/name conflict only. Its documentation includes registered projects and start/stop/restart, with proxy/custom-domain functionality. Therefore project awareness/restart are not claimed as unprecedented.
- PortLedger: https://portledger.app/portledger . Name collision: investment software; rejected to reduce confusion.
- DevBerth: https://theokimdev.com/en/blog/journeys/devberth/ . Name collision and adjacent local-service workflow; rejected.
- Microsoft GetProcessTimes and TerminateProcess API reference: https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes and https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-terminateprocess . API behavior reference only; Windows query, validation, termination and wait use one retained process handle.

## Local component register
- Supplied portpilot-app scaffold: original local input, author metadata Justin Reyes; retained and repaired under the selected MIT project license. The supplied Word handoffs contain unsupported completion claims; docs/EXECUTION-STATUS.md supersedes those claims.
- Domain, persistence, fake adapter, supervisor and renderer: original local scaffold plus locally implemented repairs/extensions; no upstream source reuse.
- Windows PowerShell/C# adapter, interactive terminal loop, live walkthrough, fixtures, checks and regression tests: new project implementation using system/runtime APIs; MIT project code.
- Node.js built-in modules and Windows PowerShell/.NET/Win32: system/runtime dependencies, installed separately, not vendored in the repository.
- Sample apps, walkthrough text and terminal captures: original project fixtures generated locally. No external images, fonts, media or example repositories.

## Positioning
PortSteward combines explicit local profiles, evidence-labelled observations and handle-bound deliberate control in a small Windows-first terminal workflow. Confirmed behavior and limitations belong in implementation status and test evidence. A competing README's silence does not prove that tool lacks a feature.
