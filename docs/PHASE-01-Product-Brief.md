# PortSteward: product brief
Executed 20 October 2026, Asia/Singapore. PortPilot remains the local folder codename.

## Audience and job
Windows developers running several local web apps and APIs need to identify the actual listener behind a busy TCP port, understand which saved project it may belong to, and deliberately manage that server.

## First-release journey
Register two sample apps with explicit executable/argument arrays. Inspect their shared expected port and its actual listener. Preview process identity, stop the selected listener deliberately, launch a saved profile, then restart only that managed server. Keep the second server running throughout.

## Three capabilities relative to the documented fkill-cli workflow
1. Versioned project profiles: folders, expected ports, executable, argument array, favorites and group labels.
2. Ownership evidence: distinguish configured expectations, path evidence, ambiguous matches and exact managed identity. A configured port alone is never proof of ownership.
3. Managed launch/restart: retain the launch definition of each run and restart only the exact process the application launched.

These describe this product's workflow; they are not claims of invention or superiority. fkill-cli documents process/name/port termination and interactive selection. Existing PortPilot products also manage projects and processes.

## First-release scope
Live Windows TCP inspection; project add/edit/delete; filtering; explicit stop/restart previews; handle-bound stop; saved launch commands; recent runs; favorites/groups; import/export; persistent one-step undo; backup recovery; terminal keyboard navigation and scriptable JSON commands.

No remote control, background monitoring service, automatic termination, inferred commands, automatic crash restarts, framework/package-script import, system resource manager, proxy, HTTPS certificates or account service.

## Research and assumptions
No external user interviews have been performed. Three to five participant interviews remain pending for phase 4; they are not substituted with invented observations.
- A1: Developers benefit from separating configured ports from observed process evidence.
- A2: Explicit launch definitions and managed identity make restart decisions understandable.
- A3: Executable and argument boundaries must survive Windows paths with spaces.
Ask participants how they currently identify a port owner, which commands they repeat, and what evidence they require before stopping a server.

## Name decision
PortPilot overlaps multiple existing developer port tools. The earlier draft's alternatives were rechecked: PortLedger has existing investment-product usage, and DevBerth is already a local-service tool. PortSteward is selected as the checked working name: a limited exact-name web search found no matching developer port tool. This is a bounded search observation, not guaranteed global availability. Direct GitHub/npm registry checks failed through the available network route; package publication is outside phases 1–3. Recheck the final owner/repository when GitHub authentication is available. See research notes.

## Implementation and reuse decision
Continue and repair the supplied original Node.js scaffold. No upstream fkill-cli source, dependency tree, screenshots, icons or assets are copied. Use Node built-ins and Windows system APIs; replace the proposed React/Ink/TypeScript dependency stack with native JavaScript modules and Node's test runner to avoid downloads. This preserves the required workflow and keyboard behavior. MIT license for project code; provenance records identify inspiration, supplied scaffold, and new work.
