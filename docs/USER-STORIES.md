# Prioritized user stories

P0 / milestone 1: Inspect live TCP listeners, process identity, observed time and missing details. Acceptance: a real loopback sample server appears under its PID and port; discovery failure is an error, not a false empty list.

P0 / milestone 2: Add/edit/delete named project profiles and filter by project. Acceptance: two project roots with spaces persist without changing executable or argument boundaries; shared expected ports remain visible as conflicts.

P0 / milestone 2: Understand ownership evidence. Acceptance: port-only expectations never become a verified owner; nested roots and missing details can remain ambiguous; observed identity is displayed separately.

P0 / milestone 3: Preview and confirm a stop. Acceptance: show command, executable, port, PID and start token; re-read identity; validate and terminate through the same Windows process handle; refuse stale identity, missing details or unsupported capability.

P0 / milestone 3: Launch and restart saved commands. Acceptance: confirm the complete launch definition, launch without a shell, verify the expected listener belongs to that process, save the run definition, and restart only that exact managed run. Restart preserves the run's original definition even if its profile was later edited.

P1 / milestone 4: Use favorites/groups, recent runs, export/import, undo and recoverable configuration. Acceptance: failed launches and child exit have observed outcomes, invalid imports change nothing, edit undo persists across CLI invocations, backups recover corrupt writes, and import never authorizes execution.

P1 / interaction: Navigate Projects, Ports, Details and History using the keyboard. Acceptance: selected rows remain visible, busy/error/cancelled/completed states are explicit, Esc cancels confirmation, terminal resize redraws safely, and light/dark/default terminal text remains readable.

Deferred: automatic package-script discovery, remote processes, daemonization, tree-wide termination, cross-platform support claims and phase 4 beta/release packaging.
