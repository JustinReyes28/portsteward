Implement and verify the Windows read-only TCP listener view.

Acceptance:
- A real local sample server is shown under its actual port and PID.
- Missing process details remain unavailable, never guessed.
- Discovery errors are visible rather than an empty-success result.
- Ports and Details views separate observed identity from project configuration.

Evidence: src/adapters.mjs, src/windows-process.ps1, live Windows integration and regression tests in portpilot-app/test.
