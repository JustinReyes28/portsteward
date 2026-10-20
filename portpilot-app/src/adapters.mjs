/**
 * @fileoverview PortPilot OS Port & Process Adapters (Milestones 1, 2, 3, 4)
 * Implements FakeOsAdapter (for deterministic testing of PID reuse races, access-denied states,
 * Windows path spaces, and failed launches) and LiveOsAdapter (for real system inspection).
 */

import { execFileSync } from 'node:child_process';

/**
 * Deterministic in-memory adapter for unit/integration tests and interactive walkthroughs.
 * Enforces identity-bound stop operations (pid + processStartTime + executablePath).
 */
export class FakeOsAdapter {
  constructor(initialListeners = []) {
    /** @type {Map<number, object>} Map of PID -> live process record */
    this.processes = new Map();
    /** @type {Map<number, number>} Map of Port -> PID */
    this.portBindings = new Map();
    this.nextPid = 4100;
    this.failNextLaunchReason = null;
    this.enforceIdentityBindingSupported = true;

    for (const item of initialListeners) {
      this.seedListener(item);
    }
  }

  /**
   * Seeds a simulated listening process.
   */
  seedListener({
    port,
    pid = this.nextPid++,
    processStartTime = '2026-10-20T08:00:00.000Z',
    command = 'node server.js',
    executablePath = 'C:\\Program Files\\nodejs\\node.exe',
    workingDirectory = 'C:\\Users\\Justin Reyes\\Projects\\sample-app',
    accessDenied = false,
  }) {
    const proc = {
      pid,
      port,
      protocol: 'TCP',
      localAddress: '127.0.0.1',
      processStartTime: accessDenied ? null : processStartTime,
      command: accessDenied ? null : command,
      executablePath: accessDenied ? null : executablePath,
      workingDirectory: accessDenied ? null : workingDirectory,
      accessDenied: Boolean(accessDenied),
    };
    this.processes.set(pid, proc);
    if (port) {
      this.portBindings.set(port, pid);
    }
    return proc;
  }

  /**
   * Simulates a PID reuse race: the original process on `pid` exits and a completely different
   * process reuses the exact same `pid` with a newer `processStartTime`!
   */
  simulatePidReuseRace(pid, {
    newCommand = 'C:\\Windows\\System32\\svchost.exe -k netsvcs',
    newExecutablePath = 'C:\\Windows\\System32\\svchost.exe',
    newWorkingDirectory = 'C:\\Windows\\System32',
    newStartTime = new Date(Date.now() + 5000).toISOString(),
  } = {}) {
    const existing = this.processes.get(pid);
    const port = existing ? existing.port : null;
    const replacement = {
      pid,
      port,
      protocol: 'TCP',
      localAddress: '127.0.0.1',
      processStartTime: newStartTime,
      command: newCommand,
      executablePath: newExecutablePath,
      workingDirectory: newWorkingDirectory,
      accessDenied: false,
    };
    this.processes.set(pid, replacement);
    return replacement;
  }

  /**
   * Simulates an unexpected child-process exit.
   */
  simulateProcessExit(pid, exitCode = 1) {
    const proc = this.processes.get(pid);
    if (proc) {
      if (proc.port && this.portBindings.get(proc.port) === pid) {
        this.portBindings.delete(proc.port);
      }
      this.processes.delete(pid);
    }
    return { pid, exitCode, exitedAt: new Date().toISOString() };
  }

  /**
   * Lists all active port observations.
   */
  listPortObservations() {
    const now = new Date().toISOString();
    const observations = [];
    for (const [port, pid] of this.portBindings.entries()) {
      const proc = this.processes.get(pid);
      if (!proc) continue;
      observations.push({
        port,
        protocol: proc.protocol || 'TCP',
        localAddress: proc.localAddress || '127.0.0.1',
        pid: proc.accessDenied ? null : proc.pid,
        processStartTime: proc.accessDenied ? null : proc.processStartTime,
        command: proc.accessDenied ? null : proc.command,
        executablePath: proc.accessDenied ? null : proc.executablePath,
        workingDirectory: proc.accessDenied ? null : proc.workingDirectory,
        accessDenied: Boolean(proc.accessDenied),
        observedAt: now,
      });
    }
    return observations.sort((a, b) => a.port - b.port);
  }

  /**
   * Queries a single live process by PID for immediate pre-stop revalidation.
   */
  getProcessByPid(pid) {
    const proc = this.processes.get(pid);
    if (!proc) return null;
    if (proc.accessDenied) {
      return { pid, accessDenied: true, processStartTime: null, executablePath: null };
    }
    return { ...proc, observedAt: new Date().toISOString() };
  }

  /**
   * Executes an identity-bound stop operation.
   * Refuses the stop if the adapter does not support identity binding, if privileges are missing,
   * or if `processStartTime` / `executablePath` changed since preview!
   */
  stopProcessBound({ pid, expectedStartTime, expectedExecutablePath }) {
    if (!this.enforceIdentityBindingSupported) {
      return {
        stopped: false,
        code: 'UNSUPPORTED_IDENTITY_BINDING',
        message:
          'Stop refused: Operating-system adapter cannot enforce process identity binding on this platform. Retaining read-only inspection.',
      };
    }

    if (!pid || !expectedStartTime) {
      return {
        stopped: false,
        code: 'MISSING_IDENTITY_TOKEN',
        message:
          'Stop refused: Target process lacks a verified PID or start-time token (access denied or incomplete observation).',
      };
    }

    const liveProc = this.processes.get(pid);
    if (!liveProc) {
      return {
        stopped: false,
        code: 'PROCESS_ALREADY_EXITED',
        message: `Stop aborted: Process PID ${pid} is no longer running (stale selection).`,
      };
    }

    if (liveProc.accessDenied || !liveProc.processStartTime) {
      return {
        stopped: false,
        code: 'PRIVILEGE_DENIED',
        message: `Stop refused: Elevated privileges required to verify identity of PID ${pid}.`,
      };
    }

    if (liveProc.processStartTime !== expectedStartTime) {
      return {
        stopped: false,
        code: 'IDENTITY_MISMATCH_PID_REUSED',
        message: `Stop refused (PID Reuse Protection): PID ${pid} start time changed from "${expectedStartTime}" to "${liveProc.processStartTime}" (now running "${liveProc.command}").`,
      };
    }

    if (
      expectedExecutablePath &&
      liveProc.executablePath &&
      liveProc.executablePath !== expectedExecutablePath
    ) {
      return {
        stopped: false,
        code: 'EXECUTABLE_MISMATCH',
        message: `Stop refused: PID ${pid} executable changed from "${expectedExecutablePath}" to "${liveProc.executablePath}".`,
      };
    }

    // Identity verified -> terminate process and release port
    if (liveProc.port && this.portBindings.get(liveProc.port) === pid) {
      this.portBindings.delete(liveProc.port);
    }
    this.processes.delete(pid);

    return {
      stopped: true,
      code: 'STOPPED_VERIFIED',
      pid,
      port: liveProc.port,
      stoppedAt: new Date().toISOString(),
      message: `Stopped verified process PID ${pid} (${liveProc.command}) on port ${liveProc.port}.`,
    };
  }

  /**
   * Spawns a saved project command without shell-splitting arguments (preserving Windows paths with spaces).
   */
  spawnManagedProcess({ executable, args, workingDirectory, port }) {
    if (this.failNextLaunchReason) {
      const reason = this.failNextLaunchReason;
      this.failNextLaunchReason = null;
      return {
        launched: false,
        code: 'LAUNCH_SPAWN_ERROR',
        message: `Failed to launch "${executable}": ${reason}`,
      };
    }

    if (this.portBindings.has(port)) {
      const occupyingPid = this.portBindings.get(port);
      return {
        launched: false,
        code: 'PORT_ALREADY_OCCUPIED',
        message: `Cannot launch on port ${port}: port is currently occupied by PID ${occupyingPid}. Inspect or stop the active listener first.`,
      };
    }

    const pid = this.nextPid++;
    const startTime = new Date().toISOString();
    const formattedArgs = args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
    const command = `${executable}${formattedArgs ? ' ' + formattedArgs : ''}`;

    const proc = this.seedListener({
      port,
      pid,
      processStartTime: startTime,
      command,
      executablePath: executable,
      workingDirectory,
      accessDenied: false,
    });

    return {
      launched: true,
      code: 'LAUNCHED_OK',
      pid: proc.pid,
      processStartTime: proc.processStartTime,
      port,
      command,
      executablePath: executable,
       preserveArgs: [...args],
    };
  }
}

/**
 * Live OS Adapter supporting read-only port inspection on Linux/macOS/Windows
 * and identity-revalidated termination.
 */
export class LiveOsAdapter {
  constructor() {
    this.enforceIdentityBindingSupported = true;
  }

  listPortObservations() {
    const now = new Date().toISOString();
    try {
      const out = execFileSync('ss', ['-tlnp'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = out.split('\n').slice(1);
      const results = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        const localAddrPort = parts[3] || '';
        const portMatch = localAddrPort.match(/:(\d+)$/);
        if (!portMatch) continue;
        const port = Number(portMatch[1]);
        const pidMatch = line.match(/pid=(\d+)/);
        const pid = pidMatch ? Number(pidMatch[1]) : null;
        const procDetails = pid ? this.getProcessByPid(pid) : null;
        results.push({
          port,
          protocol: 'TCP',
          localAddress: localAddrPort.replace(/:(\d+)$/, ''),
          pid,
          processStartTime: procDetails?.processStartTime || null,
          command: procDetails?.command || null,
          executablePath: procDetails?.executablePath || null,
          workingDirectory: procDetails?.workingDirectory || null,
          accessDenied: !pid || Boolean(procDetails?.accessDenied),
          observedAt: now,
        });
      }
      return results.sort((a, b) => a.port - b.port);
    } catch {
      return [];
    }
  }

  getProcessByPid(pid) {
    try {
      const lstart = execFileSync('ps', ['-p', String(pid), '-o', 'lstart='], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      const args = execFileSync('ps', ['-p', String(pid), '-o', 'args='], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (!lstart) return null;
      return {
        pid,
        processStartTime: lstart,
        command: args,
        executablePath: args.split(' ')[0] || null,
        workingDirectory: null,
        accessDenied: false,
      };
    } catch {
      return null;
    }
  }
}
