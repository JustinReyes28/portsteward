/**
 * @fileoverview PortPilot Process Supervisor & Workflow Controller (Milestones 1–4)
 * Coordinates read-only port discovery, project matching, identity-bound stop previews,
 * managed launches, and controlled restarts restricted strictly to tool-created runs.
 */

import {
  OwnershipConfidence,
  evaluateObservationOwnership,
  validateProjectInput,
} from './domain.mjs';

export class PortPilotSupervisor {
  /**
   * @param {object} deps
   * @param {import('./storage.mjs').RegistryStore} deps.store
   * @param {import('./adapters.mjs').FakeOsAdapter} deps.adapter
   */
  constructor({ store, adapter }) {
    this.store = store;
    this.adapter = adapter;
    this.runCounter = 1;
  }

  /**
   * Milestone 1 & 2: Inspects live ports and correlates them with the saved project registry.
   * Also reconciles any ManagedRun records whose underlying OS processes have exited.
   *
   * @param {object} options
   * @param {string} [options.filterProjectId]
   * @param {boolean} [options.favoritesOnly]
   */
  inspectDashboard({ filterProjectId = null, favoritesOnly = false } = {}) {
    const state = this.store.load();
    const observations = this.adapter.listPortObservations();

    // Reconcile managed runs against live OS process table
    for (const run of state.managedRuns) {
      if (run.status === 'running') {
        const live = this.adapter.getProcessByPid(run.pid);
        if (!live || live.processStartTime !== run.processStartTime) {
          run.status = 'exited';
          run.endedAt = new Date().toISOString();
          this.store.recordManagedRun(run);
        }
      }
    }

    let projects = state.projects;
    if (favoritesOnly) {
      projects = projects.filter((p) => p.favorite);
    }
    if (filterProjectId) {
      projects = projects.filter((p) => p.id === filterProjectId);
    }

    const matches = observations.map((obs) =>
      evaluateObservationOwnership(obs, state.projects, state.managedRuns)
    );

    const filteredMatches = matches.filter((m) => {
      if (filterProjectId) {
        return m.matchedProjects.some((p) => p.id === filterProjectId);
      }
      if (favoritesOnly) {
        return m.matchedProjects.some((p) => p.favorite);
      }
      return true;
    });

    return {
      observedAt: new Date().toISOString(),
      projects,
      allProjectsCount: state.projects.length,
      portMatches: filteredMatches,
      recentRuns: state.managedRuns.slice(0, 15),
      recoveryNotice: this.store.lastRecoveryNotice,
    };
  }

  /**
   * Milestone 2: Adds or updates a project in the local registry.
   */
  saveProject(projectInput) {
    const validated = validateProjectInput(projectInput);
    return this.store.upsertProject(validated);
  }

  /**
   * Milestone 3: Generates a mandatory pre-stop preview before any process change.
   * Displays project, command, port, PID, start time, and whether restart is available.
   */
  previewStopByPort(port) {
    const state = this.store.load();
    const observations = this.adapter.listPortObservations();
    const obs = observations.find((o) => o.port === Number(port));

    if (!obs) {
      return {
        canStop: false,
        canRestart: false,
        port: Number(port),
        reason: `No active listener found on port ${port}.`,
      };
    }

    const ownership = evaluateObservationOwnership(obs, state.projects, state.managedRuns);

    if (obs.accessDenied || !obs.pid || !obs.processStartTime) {
      return {
        canStop: false,
        canRestart: false,
        port: obs.port,
        pid: obs.pid,
        ownership,
        reason:
          'Stop unavailable: Process identity details (PID / start time) are inaccessible due to OS privilege boundaries. Retaining read-only inspection.',
      };
    }

    if (!this.adapter.enforceIdentityBindingSupported) {
      return {
        canStop: false,
        canRestart: false,
        port: obs.port,
        pid: obs.pid,
        ownership,
        reason:
          'Stop unavailable: Current OS adapter cannot guarantee identity-bound process termination. Retaining read-only inspection.',
      };
    }

    const isManagedByTool = ownership.confidence === OwnershipConfidence.EXACT_MANAGED;

    return {
      canStop: true,
      canRestart: isManagedByTool,
      port: obs.port,
      pid: obs.pid,
      processStartTime: obs.processStartTime,
      executablePath: obs.executablePath,
      command: obs.command,
      workingDirectory: obs.workingDirectory,
      projectName: ownership.primaryProject?.name || null,
      projectId: ownership.primaryProject?.id || null,
      managedRunId: ownership.managedRun?.runId || null,
      confidence: ownership.confidence,
      conflictProjects: ownership.conflictProjects.map((p) => p.name),
      restartPolicyNote: isManagedByTool
        ? `Managed run (${ownership.managedRun.runId}): eligible for controlled stop or restart.`
        : 'External process: can be stopped explicitly after identity re-verification, but restart is disabled (PortPilot never infers restart commands from unrelated process names).',
    };
  }

  /**
   * Milestone 3: Executes a deliberate stop bound to the previewed process identity.
   * Immediately re-reads the process identity before stopping so stale selections cannot hit a reused PID.
   */
  executeConfirmedStop(previewToken) {
    if (!previewToken || !previewToken.canStop) {
      return {
        ok: false,
        code: 'INVALID_PREVIEW_TOKEN',
        message: previewToken?.reason || 'Stop action requires a valid, confirmable preview token.',
      };
    }

    const stopResult = this.adapter.stopProcessBound({
      pid: previewToken.pid,
      expectedStartTime: previewToken.processStartTime,
      expectedExecutablePath: previewToken.executablePath,
    });

    if (stopResult.stopped && previewToken.managedRunId) {
      this.store.recordManagedRun({
        runId: previewToken.managedRunId,
        status: 'stopped',
        endedAt: stopResult.stoppedAt,
      });
    }

    return {
      ok: stopResult.stopped,
      code: stopResult.code,
      message: stopResult.message,
      pid: previewToken.pid,
      port: previewToken.port,
    };
  }

  /**
   * Milestone 3 & 4: Launches a registered project from its saved profile.
   * Checks for port conflicts upfront and leaves registry intact if launch fails.
   */
  launchProject(projectId, { preferredPort = null } = {}) {
    const state = this.store.load();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) {
      return {
        ok: false,
        code: 'PROJECT_NOT_FOUND',
        message: `Project "${projectId}" does not exist in the registry.`,
      };
    }

    const targetPort = preferredPort ? Number(preferredPort) : project.expectedPorts[0];
    const runId = `run-${Date.now()}-${this.runCounter++}`;

    const spawnOutcome = this.adapter.spawnManagedProcess({
      executable: project.launchExecutable,
      args: project.launchArgs,
      workingDirectory: project.rootPath,
      port: targetPort,
    });

    if (!spawnOutcome.launched) {
      this.store.recordManagedRun({
        runId,
        projectId: project.id,
        projectName: project.name,
        pid: null,
        processStartTime: null,
        port: targetPort,
        launchExecutable: project.launchExecutable,
        launchArgs: project.launchArgs,
        rootPath: project.rootPath,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        status: 'failed',
        lastError: spawnOutcome.message,
      });

      return {
        ok: false,
        code: spawnOutcome.code,
        runId,
        projectId: project.id,
        port: targetPort,
        message: spawnOutcome.message,
      };
    }

    const managedRun = this.store.recordManagedRun({
      runId,
      projectId: project.id,
      projectName: project.name,
      pid: spawnOutcome.pid,
      processStartTime: spawnOutcome.processStartTime,
      port: targetPort,
      launchExecutable: project.launchExecutable,
      launchArgs: project.launchArgs,
      rootPath: project.rootPath,
      startedAt: spawnOutcome.processStartTime,
      endedAt: null,
      status: 'running',
      lastError: null,
    });

    return {
      ok: true,
      code: 'MANAGED_RUN_STARTED',
      run: managedRun,
      message: `Launched "${project.name}" (${runId}) on port ${targetPort} with PID ${spawnOutcome.pid}.`,
    };
  }

  /**
   * Milestone 3: Controlled restart strictly limited to runs created by PortPilot.
   * Refuses to restart external/unrelated processes.
   */
  restartByPort(port) {
    const preview = this.previewStopByPort(port);
    if (!preview.canStop) {
      return {
        ok: false,
        code: 'RESTART_STOP_UNAVAILABLE',
        message: `Cannot restart on port ${port}: ${preview.reason}`,
      };
    }

    if (!preview.canRestart || !preview.managedRunId || !preview.projectId) {
      return {
        ok: false,
        code: 'UNMANAGED_PROCESS_RESTART_REFUSED',
        message: `Restart refused on port ${port} (PID ${preview.pid}): Process was not launched by PortPilot. Only managed runs have a verified restart profile.`,
      };
    }

    const stopRes = this.executeConfirmedStop(preview);
    if (!stopRes.ok) {
      return {
        ok: false,
        code: stopRes.code,
        message: `Restart aborted during stop phase: ${stopRes.message}`,
      };
    }

    const launchRes = this.launchProject(preview.projectId, { preferredPort: preview.port });
    if (!launchRes.ok) {
      return {
        ok: false,
        code: launchRes.code,
        message: `Process stopped, but re-launch failed: ${launchRes.message}`,
      };
    }

    return {
      ok: true,
      code: 'MANAGED_RUN_RESTARTED',
      previousRunId: preview.managedRunId,
      previousPid: preview.pid,
      newRun: launchRes.run,
      message: `Restarted "${preview.projectName}" on port ${preview.port}: stopped PID ${preview.pid} and launched PID ${launchRes.run.pid} (${launchRes.run.runId}).`,
    };
  }
}
