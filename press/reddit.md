# Reddit drafts

## Command-line audience

### Title
I built PortSteward: a Windows terminal tool for project-aware dev ports

### Body
A busy port and a process called node.exe still leave one question: which project is this?

I've made PortSteward public to work through that problem. It's a Windows terminal tool that keeps saved project profiles separate from what the operating system actually reports.

You can register a folder, its expected ports and an explicit launch command. The port view then shows the listener, available process details and the evidence linking it to a project. If two profiles expect port 3000, that conflict stays visible.

Before a stop, you get a process preview and a confirmation. The Windows adapter checks identity and stops through the same process handle. Restart is limited to servers PortSteward launched, using that run's saved command.

It's an early alpha: Node.js 25.2.1, PowerShell 5.1, MIT license, no third-party npm dependencies. Stop is forceful and targets one process. Commands that hand the listener to a child, such as npm wrappers, aren't supported as managed runs yet.

There are 27 automated tests and a real Windows two-server test. Both pass in CI.

Source and examples: https://github.com/JustinReyes28/portsteward

I'm the builder. Which process details would you want to see before confirming a stop?

### Suggested attachment
assets/portsteward-wide.png

Alt text: PortSteward, a Windows alpha for local development ports. An illustrated port 3000 example lists Sample Web and Sample API as expected profiles, while the observed listener is PID 4820 with an unverified owner. Labelled illustrated sample data.

## Web-development audience

### Title
A small Windows tool for telling your local dev servers apart

### Body
I've made PortSteward public, an early Windows terminal app for developers running several local projects.

Save each project's folder, expected ports and launch command. When a port is busy, inspect the actual listener alongside those saved expectations. Two projects configured for port 3000 show up as a conflict rather than a guessed owner.

The workflow is: inspect, preview the process, confirm a stop, then launch from a saved profile. You can restart a server the tool launched while leaving another project running.

It's MIT licensed and runs from source with Node.js 25.2.1 and PowerShell 5.1. There are no third-party npm dependencies. Stop is forceful and direct-process only; wrappers that move the listener into a child aren't supported as managed runs.

Repo, examples and test evidence: https://github.com/JustinReyes28/portsteward

I'm the builder and would like feedback on the setup and ownership labels. What information helps you decide that a busy port belongs to the project you think it does?

### Suggested attachment
Use the wide card above, or record the actual sample workflow in demo-script.md.

## Before submitting
Choose the version that fits the community. Confirm current rules and any self-promotion or feedback-thread requirements. These are drafts, not scheduled or submitted posts.
