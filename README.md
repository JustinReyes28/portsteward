# PortPilot

Know which development project owns a port and manage that project's server deliberately.

**Status: planning.** This repository currently documents the proposed product. An application, installable package, and public release have not been implemented here.

## Intended workflow

Resolve a port conflict without guessing which process belongs to which project.

The first release is planned around this task:

Register two sample apps, identify an occupied port, launch one from its profile, and restart only that managed server.

## Planned capabilities

- A project registry that maps folders, expected ports, and launch commands to named development projects.
- Live port ownership views that explain observed process identity separately from saved project configuration.
- Controlled restart for processes launched by PortPilot, with saved profiles and recent activity.

These are roadmap items, not claims of shipped functionality. The phase plans define the implementation milestones and completion criteria.

## Development plan

1. [Define the product and its differences](PLAN-01-Product-and-Differentiation.md).
2. [Design the workflow and set up GitHub](PLAN-02-Design-Architecture-and-GitHub.md).
3. [Build and improve the application](PLAN-03-Build-and-Improve.md).
4. [Validate and publish a versioned release](PLAN-04-Validation-and-GitHub-Release.md).
5. [Introduce the product and maintain it](PLAN-05-Marketing-and-Maintenance.md).

[Full plan index](Project-Plans-2026-10-12.md)

## Inspiration and credit

[fkill-cli](https://github.com/sindresorhus/fkill-cli) inspired the initial direction. PortPilot's planned focus is the workflow and capabilities described above.

[Inspiration summary](Repo-Inspiration-2026-10-12.md) · [Original reference notes](INSPIRATION-REFERENCE.md)

Any reused code or assets must be identified in the project's provenance records and retain the applicable notices. Credit here identifies inspiration; it does not imply affiliation or endorsement.

## Public GitHub release

The intended outcome is a public repository for this product, with an accurate README, code, examples, and a tested versioned release. The final repository name and owner will be recorded during setup. Installation instructions, screenshots, and demonstrated behaviour will be added as implementation progresses.

The working product name is still subject to the name check described in phase 1.

