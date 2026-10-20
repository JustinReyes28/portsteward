# Facts and boilerplate
Prepared from the repository and its recorded test evidence on 20 October 2026.

## Product
Name: PortSteward
Version: 0.1.0-alpha.1
Status: public source alpha; phase 4 unassisted beta and versioned release remain pending.
Builder: Justin Reyes / GitHub @JustinReyes28, as recorded in package metadata.
Repository: https://github.com/JustinReyes28/portsteward
Feedback: https://github.com/JustinReyes28/portsteward/issues
License: MIT.

## One line
PortSteward helps Windows developers inspect busy local ports, compare listeners with saved project profiles, and deliberately manage servers.

## Short boilerplate
PortSteward is an MIT-licensed Windows terminal application for local development servers. It combines saved project profiles with live TCP listener details and explicit ownership evidence. Users preview and confirm process actions; managed restart is limited to servers the tool launched. The alpha runs from source without third-party npm dependencies.

## What to show
- Two profiles can expect the same port without either becoming a verified owner.
- The listener's PID, available details and ownership evidence are visible before an action.
- A saved command launches without shell splitting.
- Restarting the exact managed web server leaves the separate API server responding.
- Favorites, groups, history, persistent profile undo and profile import/export support daily use.

## Evidence
- 27 automated tests: https://github.com/JustinReyes28/portsteward/blob/main/docs/evidence/unit-tests.txt
- One real Windows two-server integration test: https://github.com/JustinReyes28/portsteward/blob/main/docs/evidence/windows-tests.txt
- Passing Windows CI for the implementation commit: https://github.com/JustinReyes28/portsteward/actions/runs/39391307911
- Requirement-to-source evidence: https://github.com/JustinReyes28/portsteward/blob/main/docs/PHASE-03-Build-and-Evidence.md
- Test code: https://github.com/JustinReyes28/portsteward/tree/main/portpilot-app/test

These checks substantiate the documented scenarios. They do not establish production readiness or compatibility with every Windows environment.

## Support and honest limits
Locally tested with Node.js 25.2.1, Windows_NT 10.0.26200 x64 and PowerShell 5.1, plus a GitHub-hosted Windows CI run. The package targets the tested Node 25 major.
Stop is forceful and targets one process. It does not gracefully shut down an app or infer a process tree.
A wrapper whose listener runs under another PID does not qualify for managed readiness/restart. Launch the actual server executable/script.
Optional command details may be unavailable under privilege restrictions.
There is no npm installation command, public binary or versioned GitHub release yet.
Avoid claims of guaranteed safety, universal ownership detection, cross-platform support or performance improvements.

## Inspiration and attribution
fkill-cli inspired the initial direction. No upstream fkill-cli code or assets were copied. Existing tools also provide project and process management; these features are not presented as unprecedented.
Provenance: https://github.com/JustinReyes28/portsteward/blob/main/docs/PROVENANCE.md

## Image notes
The PNG share cards are original editorial illustrations using public sample data. They are labelled as illustrations and contain no personal project paths. They are not live product screenshots.
Palette: warm paper, deep ink, muted green and orange. Typography: installed Segoe UI and Consolas, rasterized locally. No font or stock-image download.
The repository's MIT license covers the original project media and copy. No font files are bundled.

## Announcement wording
Say "public source alpha" or "I've made the repository public." A public repository is separate from a tested versioned release. The social drafts are prepared for the builder; no account has posted them.
