# PortPilot — phase 1: product definition and differentiation

Working product name: **PortPilot** (availability not yet checked). Inspiration: [fkill-cli](https://github.com/sindresorhus/fkill-cli). Prepared 12 October 2026, Asia/Singapore.

Execution status: completed 20 October 2026 for the working name PortSteward. See [verified execution record](docs/EXECUTION-STATUS.md). The requirements below remain the original plan; public release and social posts are outside phases 1–3.

[1. Product](PLAN-01-Product-and-Differentiation.md) · [2. Design + GitHub](PLAN-02-Design-Architecture-and-GitHub.md) · [3. Build](PLAN-03-Build-and-Improve.md) · [4. Validate + release](PLAN-04-Validation-and-GitHub-Release.md) · [5. Market + maintain](PLAN-05-Marketing-and-Maintenance.md)

## Intended result

Know which development project owns a port and manage that project's server deliberately.

Primary audience: Developers running several local web apps, APIs, and background development servers on Windows.

Core job: Resolve a port conflict without guessing which process belongs to which project.

## Beginning: validate the problem

1. Use the existing [research notes](INSPIRATION-REFERENCE.md) as context, then compare the current upstream README and relevant alternatives before claiming a difference.
2. Observe how three to five potential users perform the job. This is a suggested small research sample, not evidence already collected. Record concrete friction, current tools, and the desired outcome.
3. Ask these focused questions:

- When a port is busy, how do you identify the owning project?
- Which project commands and ports do you reopen each day?
- What information must you see before stopping a server?

4. Check GitHub and the web for the working name, similar tools, and confusing branding. Choose a distinct name and original visual direction before creating public assets.
5. Pick one complete user journey for the first release. Publish a clear feature boundary in the product brief.

## What we will add or change

The original product's value should be demonstrable in these capabilities:

- A project registry that maps folders, expected ports, and launch commands to named development projects.
- Live port ownership views that explain observed process identity separately from saved project configuration.
- Controlled restart for processes launched by PortPilot, with saved profiles and recent activity.

Improve the underlying experience as well:

- Refresh process identity immediately before any stop action so stale selections cannot target a reused process ID.
- Provide a preview showing project, command, port, and process before changes.
- Explain missing privileges and unavailable process details without presenting guessed ownership as fact.

Initial scope boundary: A general task manager, background services, remote process control, automatic cleanup of unrelated processes, and automatic restarts are outside version 1.

## Make the project's relationship to upstream clear

- Default implementation direction: write an original application around the stated job using maintained dependencies where suitable. Decide explicitly if any upstream code will be reused.
- Keep a provenance register: component, source URL/version, inspired/reused/independent status, license, and what was changed. Use accurate wording in the eventual README.
- If reusing MIT-covered source, include the original copyright and permission notices. [MIT license text](https://opensource.org/license/mit)
- Credit fkill-cli as inspiration; describe the specific reused components if adaptation becomes the chosen route.
- Create your own screenshots, sample data, interface composition, copy, and product identity. Maintain examples showing the newly built workflow and development decisions.
- Confirm the proposed differences against the latest competing products. A feature plan is not evidence that a feature is unprecedented.

## Outputs and phase completion

Produce a one-page product brief, a prioritised user-story list, a comparison/provenance register, a checked working name, and the first-release scope.

Move to phase 2 when you can show: one defined audience and job; three concrete product differences; one end-to-end first-release journey; and a clear implementation/reuse decision. Any user interviews still pending are labelled as pending, with assumptions recorded.

Owner: the project builder; testers supply problem evidence. Sequence follows completion gates rather than calendar promises.
