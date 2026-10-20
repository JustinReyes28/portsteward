# PortPilot — phase 2: interaction design, architecture, and GitHub setup

Working product name: **PortPilot** (availability not yet checked). Inspiration: [fkill-cli](https://github.com/sindresorhus/fkill-cli). Prepared 12 October 2026, Asia/Singapore.

Execution status: completed 20 October 2026 for the working name PortSteward. See [verified execution record](docs/EXECUTION-STATUS.md). The requirements below remain the original plan; public release and social posts are outside phases 1–3.

[1. Product](PLAN-01-Product-and-Differentiation.md) · [2. Design + GitHub](PLAN-02-Design-Architecture-and-GitHub.md) · [3. Build](PLAN-03-Build-and-Improve.md) · [4. Validate + release](PLAN-04-Validation-and-GitHub-Release.md) · [5. Market + maintain](PLAN-05-Marketing-and-Maintenance.md)

## Entry condition and goal

Phase 1 has a defined audience, first-release journey, and provenance decision. Translate that decision into an original interface and a small design that can be built incrementally.

## Design the complete workflow

Projects shows saved folders and expected ports. Ports shows live listeners. Details shows the observed owner and available actions. Launch history records only actions the tool actually performed.

Sketch normal, empty, loading, failure, cancelled, and completed states. Define which state owns a user's changes and what happens when they go back. Specify keyboard navigation, focus, terminal resize, plain-language errors, and light/dark display before implementing polish.

Use original sample content to walk through the full task. Resolve confusing steps in the sketch before adding more features.

## Proposed components

- Original terminal interface: TypeScript/React/Ink for project and port views.
- Port/process adapter: read-only discovery through maintained cross-platform libraries or OS-backed adapters.
- Project registry: versioned local config containing paths, expected ports, and explicit command/argument lists.
- Process supervisor: launch only saved commands chosen by the user. The adapter must bind a stop operation to the validated process identity, using an identity-bound operating-system primitive where supported. If that binding cannot be established, refuse the stop and retain read-only inspection. Revalidation alone is not a guarantee against every process-ID race.

Proposed data model:

Project: id, name, rootPath, expectedPorts[], launchExecutable, launchArgs[]. Observation: port, pid, processStartTime, command, observedAt, confidence. ManagedRun: projectId, pid, startTime, status.

Design decision: Limit restart to runs created by the tool. An unrelated process can be inspected and stopped explicitly, but a restart command must not be inferred from its name.

Prototype the identity-bound stop adapter before enabling process changes. Test a process identity change between observation and action; keep stop/restart unavailable wherever the adapter cannot enforce the identity requirement. Document this support boundary in the interface and README. Document storage location, format versioning, import/export behaviour, and recovery from partial writes. Choose a supported Windows-first environment and pin the eventual runtime/dependency requirements. Broaden platform claims only after testing them.

## Keep the build small

- Separate the user interface, the product's domain rules, persistence, and external adapters.
- Build against small fake adapters and original fixtures before testing remote services or real operating-system actions.
- Implement the first-release scope from phase 1. Put optional integrations behind an explicit backlog decision.
- Record a baseline for start-up, primary task responsiveness, and installed footprint on a named test machine. Set targets after observing that baseline.

## Required GitHub milestone: one repository for this product

Public GitHub publication is the intended outcome. Select the owner and checked repository name during setup; the development visibility and publishing date remain implementation decisions.

1. Choose the user's GitHub owner, checked repository name, and intended visibility; names and account details are not invented in this plan.
2. Prepare the original scaffold locally, with the product brief, five phase plans, README, selected project license, ignore rules, and provenance/credits.
3. Create the separate remote repository under that chosen owner and visibility. [GitHub repository creation](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
4. Push reviewed local commits, then verify their remote contents. [Adding local code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
5. Record the actual URL in the local notes. Create issues for the phase 3 milestones and configure relevant build/type checks.

Keep generated dependencies, private local data, credentials, and machine-specific settings out of the committed tree. Review the concrete staged files before an upload. Do this during implementation, not during this document-only task.

## Outputs and exit criteria

Outputs: workflow sketches, state transitions, data model, dependency decisions, provenance register, original scaffold, and a verified GitHub repository URL.

Complete when the main journey and recovery states can be demonstrated from the sketches, persistence rules are defined, and the first reviewed scaffold is visible in the correct remote repository. Phase 3 depends on this recorded setup.
