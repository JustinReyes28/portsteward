Implement explicit saved launch, handle-bound stop and exact managed restart.

Acceptance:
- Show complete process/command/port/PID/start-token preview.
- Require deliberate confirmation; refuse expired/cancelled/reused previews.
- Re-read identity, then validate and terminate through the same retained Windows handle.
- Refuse unrelated restart and preserve the original managed-run command after profile edits.
- Observe a listener owned by the launched process before reporting launch success.
- Restart one real sample server while the second remains responsive.

Evidence: native helper, supervisor, CLI, terminal loop and real Windows integration.
