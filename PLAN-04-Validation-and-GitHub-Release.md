# PortPilot — phase 4: quality validation, beta feedback, and GitHub release

Working product name: **PortPilot** (availability not yet checked). Inspiration: [fkill-cli](https://github.com/sindresorhus/fkill-cli). Prepared 12 October 2026, Asia/Singapore.

Status: proposed plan. This task creates documents only; implementation, repository uploads, releases, and social posts are future work.

[1. Product](PLAN-01-Product-and-Differentiation.md) · [2. Design + GitHub](PLAN-02-Design-Architecture-and-GitHub.md) · [3. Build](PLAN-03-Build-and-Improve.md) · [4. Validate + release](PLAN-04-Validation-and-GitHub-Release.md) · [5. Market + maintain](PLAN-05-Marketing-and-Maintenance.md)

## Entry condition and acceptance focus

Phase 3's complete workflow is available in the project's GitHub repository. Validate the product's state and data behaviour, then make the release reproducible.

## Meaningful project-specific checks

- Process ID reuse, delayed selection, and identity changes between observation and action: the stop remains bound to the validated process or is refused.
- Two projects sharing a configured port: display the conflict and actual listener.
- Child processes, occupied ports, missing executables, and denied process details: report the observed outcome.
- Windows paths with spaces: executable and arguments retain their intended boundaries; saved config is treated as user input.

Run the end-to-end task on the Windows environment claimed in the README, including paths with spaces and a fresh user-data directory. Add other systems to the support list only after checking them. Record the exact version, machine/environment, fixture, expected outcome, and observed result for failed or critical checks.

Measure start-up and the primary interaction again against phase 2's baseline. Publish performance or footprint claims only from recorded measurements.

## Small beta and decisions

Invite a suggested three to five relevant testers who choose to participate. The number is a proposed validation sample, not a launch forecast. Give them this task without a guided walkthrough:

Register two sample apps, identify an occupied port, launch one from its profile, and restart only that managed server.

Observe completion, confusion, failures, and requests. Log reproducible bugs separately from optional feature ideas. Re-test changed behaviour after a fix; expand checks when a new failure warrants it.

Release gate: all beta-blocking failures are resolved; the core task completes without unplanned help for at least three testers; remaining limitations are stated. If those proposed targets prove unsuitable, record the revised gate and reason before release.

## Required GitHub upload and release checklist

The intended release destination is the public GitHub repository for this product. Verify audience access before linking it from launch posts.

- Verify the intended owner's repository contains the final code, plans, build instructions, original examples, and accurate attribution.
- Complete the README with the product job, supported environment, install/use instructions, demo, feature differences, limitations, and feedback path.
- Review the code and any distributed dependencies' required notices; keep reuse claims consistent with the provenance register.
- Build from the release commit in a clean temporary checkout after implementation/download work is separately authorised.
- Prepare a version tag, release notes, tested packages or binaries as appropriate, and checksums for distributed artifacts.
- Create the versioned GitHub release and attach the tested assets; verify the tag, commit, and download links. [Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- Check that the audience can access the intended repository/release URL at the chosen visibility. Public marketing requires a reachable public destination or an explicitly described private beta route.
- Replace provisional name/URL fields only after the actual account and final name are known.

GitHub publishing is a required project outcome. The current plans do not perform an upload.

## Demo and launch handoff

Demo concept: Show two sample development projects, a port conflict, the process preview, and restart of a managed server.

Prepare original screenshots, a short video or screen recording, release notes, the provenance summary, and a verified URL. Use only public sample data in the marketing assets.

Phase 4 ends when the documented build works, checks pass, beta criteria are met, code is uploaded, the versioned GitHub release is verified, and the launch kit makes only demonstrated claims.

