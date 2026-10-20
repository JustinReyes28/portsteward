# PortPilot — phase 3: build the original product and improve the experience

Working product name: **PortPilot** (availability not yet checked). Inspiration: [fkill-cli](https://github.com/sindresorhus/fkill-cli). Prepared 12 October 2026, Asia/Singapore.

Status: proposed plan. This task creates documents only; implementation, repository uploads, releases, and social posts are future work.

[1. Product](PLAN-01-Product-and-Differentiation.md) · [2. Design + GitHub](PLAN-02-Design-Architecture-and-GitHub.md) · [3. Build](PLAN-03-Build-and-Improve.md) · [4. Validate + release](PLAN-04-Validation-and-GitHub-Release.md) · [5. Market + maintain](PLAN-05-Marketing-and-Maintenance.md)

## Entry condition

Phase 2's workflow, architecture, and GitHub setup are complete. Build one usable path at a time. Each milestone below needs its demonstration before the next expansion.

## Build milestone 1: Ship a read-only live port view

- Create the original ports list and detail panel.
- Read listeners and observed process details.
- Mark inaccessible or stale observations clearly.

Acceptance: A local sample server is shown on the correct port, and unknown details remain unknown.

## Build milestone 2: Make the tool project-aware

- Add and edit a project registry.
- Match configured ports and paths against observations, preserving confidence information.
- Filter by project and show conflicts when more than one registry entry fits.

Acceptance: Two sample projects can be distinguished, and an ambiguous match is visible rather than silently resolved.

## Build milestone 3: Add deliberate stop and managed restart

- Preview the action and require a deliberate selection.
- Re-read process identity before a stop.
- Launch an explicit saved command and enable restart only for the managed run.

Acceptance: A stale selection is rejected when identity changes, including between observation and action. A stop uses the validated identity binding or is refused; unrelated processes have no inferred restart command.

## Build milestone 4: Improve daily use

- Add favourite project groups and recent managed runs.
- Handle occupied ports, failed launches, and child-process exit.
- Keep configuration export/import and undo of registry edits simple.

Acceptance: A failed launch produces an actionable message and leaves the registry intact.

## Improvements that must ship with the new capabilities

- Refresh process identity immediately before any stop action so stale selections cannot target a reused process ID.
- Provide a preview showing project, command, port, and process before changes.
- Explain missing privileges and unavailable process details without presenting guessed ownership as fact.

These improvements belong in the same acceptance review as the product-specific features. A visible success message must correspond to an observed completed operation, and cancellation/failure must leave a documented state.

## Keep implementation reviewable on GitHub

- Map each milestone to a GitHub issue with its acceptance criterion.
- Commit complete increments explaining the changed behaviour. Keep UI work, domain changes, and dependency updates understandable in review.
- Push the implemented increments to this product's own repository. Record which commit demonstrates each new capability.
- Update documentation and provenance whenever a dependency or adapted component changes. Link upstream inspiration accurately.
- Use checks for meaningful behaviours: data round trips, state transitions, and the operation boundaries relevant to this tool. Do not count screenshot resemblance or cosmetic differences as completion evidence.

## Evidence of the new product

Create a short walkthrough of the core journey using original sample content. For each of the three phase 1 differences, point to the implemented screen/action, its data behaviour, and the commit/issue that introduced it.

Maintain an implementation-status list: working, partially implemented, deferred. README claims and demo captions must match this list. If a proposed difference already exists elsewhere, revise the positioning around the actual workflow rather than claiming invention.

## Handoff to validation

Prepare the build, test fixtures, supported-environment list, and a concise explanation of known limitations. Save the expected beta task:

Register two sample apps, identify an occupied port, launch one from its profile, and restart only that managed server.

Phase 3 finishes when the complete first-release task and all three planned differences work together, interrupted operations have defined outcomes, and the corresponding code/documentation is uploaded to the correct GitHub repository. Optional features remain in the backlog.

