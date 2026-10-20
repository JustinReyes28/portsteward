> Historical inspiration research, recorded before development. Repository statistics and source-file descriptions below refer to the upstream inspiration, not this new project.

# fkill-cli

Additional inspiration pick.

[Original repository](https://github.com/sindresorhus/fkill-cli)

An interactive process utility that can stop processes by name, process ID, or port, with fuzzy searching.

## Snapshot

- GitHub stars: 7,008
- GitHub-reported repository size: 1,274 KB
- Stack: JavaScript / Node.js / Inquirer
- Repository license: MIT
- Selected source/configuration files: 2; 11,829 bytes (11.6 KiB)
- Total tracked files on the checked branch: 13
- Default branch: main
- Latest repository push reported by GitHub: 2025-11-09 (UTC date; not a release date)

## Why it fits

My strongest additional pick for a first spin: only two main JavaScript files, a clearly defined problem, and documented Windows support. The process operations are delegated to dependencies, keeping the interface small.

Difficulty assessment: Small: a useful first project if you already know JavaScript.

Runtime footprint: Node.js 20+. Uses packages such as fkill, ps-list, pid-port, and Inquirer; their implementation is outside the two-file count.

The source count excludes test.js and fixture.js.

## A spin you could build

**Proposed concept: PortPilot — a dashboard for the development servers you run.**

These are suggested directions for your own project, rather than claims that no other tool has them.

- Show familiar development ports alongside their process names.
- Label running servers by project and save favourite port groups.
- Show process details and a confirmation before stopping a selected server.

First version: List a small set of development ports, identify their processes, and let the user stop one selected process. Add project labels next.

## Files to inspect online later

- [cli.js](https://github.com/sindresorhus/fkill-cli/blob/2afe64c9110612ef377d0aa8fdcf8c0ba8d940a1/cli.js)
- [interactive.js](https://github.com/sindresorhus/fkill-cli/blob/2afe64c9110612ef377d0aa8fdcf8c0ba8d940a1/interactive.js)

## Sources

- [Project overview and README](https://github.com/sindresorhus/fkill-cli#readme)
- [Dependency manifest](https://github.com/sindresorhus/fkill-cli/blob/2afe64c9110612ef377d0aa8fdcf8c0ba8d940a1/package.json)
- [GitHub repository metadata](https://api.github.com/repos/sindresorhus/fkill-cli)
- [Checked file-list metadata](https://api.github.com/repos/sindresorhus/fkill-cli/git/trees/2afe64c9110612ef377d0aa8fdcf8c0ba8d940a1?recursive=1)

## How size was checked

Research date: 12 October 2026 (Asia/Singapore). Stars and repository size came from the public GitHub API. "Repository size" is GitHub's reported size in KB, not a measured clone, installed dependency, release-binary, or build size.

Source counts and byte totals were calculated from default-branch file-list metadata for .ts, .tsx, .js, .jsx, .go, and .rs files, excluding test files and test, fixture, vendor, dependency, generated-build, script, and example folders. They measure the project's own selected files, not dependency code or lines of code.

Selection: focused terminal utilities, at least 2,000 stars, and below 5,000 KB of GitHub-reported repository size. Difficulty and spin ideas are my assessments, not upstream promises.

Status: details only. No repository, source code, asset, dependency, or executable has been cloned, downloaded, or installed locally.

