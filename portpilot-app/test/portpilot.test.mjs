/**
 * @fileoverview PortPilot Automated Acceptance & Milestone Verification Suite
 * Covers Phase 2 Architecture & Phase 3 Build Milestones 1–4 + Edge Cases:
 *  - Milestone 1: Read-only live port view & access-denied boundary
 *  - Milestone 2: Project registry, path/port confidence, and ambiguous conflict visibility
 *  - Milestone 3: Identity-bound stop, PID reuse race rejection, and managed-only restart
 *  - Milestone 4: Daily ergonomics (favorites, recent runs, occupied port, failed launch, undo, import/export, .bak recovery)
 *  - Windows paths with spaces boundary preservation
 *  - End-to-End Beta Task verification
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { OwnershipConfidence } from '../src/domain.mjs';
import { RegistryStore } from '../src/storage.mjs';
import { FakeOsAdapter } from '../src/adapters.mjs';
import { PortPilotSupervisor } from '../src/supervisor.mjs';
import { runBetaTaskWalkthrough } from '../src/cli.mjs';

function createTestHarness(initialListeners = []) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portpilot-test-'));
  const registryPath = path.join(tempDir, 'registry.json');
  const store = new RegistryStore(registryPath);
  const adapter = new FakeOsAdapter(initialListeners);
  const supervisor = new PortPilotSupervisor({ store, adapter });
  return {
    tempDir,
    registryPath,
    store,
    adapter,
    supervisor,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
}

test('Milestone 1: Read-only live port view shows active listener and preserves unknown/access-denied details', () => {
  const h = createTestHarness([
    {
      port: 3000,
      pid: 5100,
      processStartTime: '2026-10-20T08:00:00.000Z',
      command: 'node dev.js',
      executablePath: 'C:\\Program Files\\nodejs\\node.exe',
      workingDirectory: 'C:\\Projects\\sample-app',
      accessDenied: false,
    },
    {
      port: 5432,
      pid: 880,
      accessDenied: true,
    },
  ]);

  try {
    const dash = h.supervisor.inspectDashboard();
    assert.equal(dash.portMatches.length, 2);

    const match3000 = dash.portMatches.find((m) => m.port === 3000);
    assert.equal(match3000.observation.pid, 5100);
    assert.equal(match3000.confidence, OwnershipConfidence.UNMATCHED);

    const match5432 = dash.portMatches.find((m) => m.port === 5432);
    assert.equal(match5432.observation.pid, null);
    assert.equal(match5432.confidence, OwnershipConfidence.ACCESS_DENIED);
    assert.match(match5432.explanation, /OS privileges prevented reading process identity/);
  } finally {
    h.cleanup();
  }
});

test('Milestone 2: Project registry distinguishes two sample projects and surfaces ambiguous port conflicts clearly', () => {
  const h = createTestHarness([
    {
      port: 3000,
      pid: 6101,
      processStartTime: '2026-10-20T08:05:00.000Z',
      command: 'node "C:\\Users\\Justin Reyes\\Projects\\App Alpha\\server.js"',
      executablePath: 'C:\\Program Files\\nodejs\\node.exe',
      workingDirectory: 'C:\\Users\\Justin Reyes\\Projects\\App Alpha',
    },
    {
      port: 8080,
      pid: 6202,
      processStartTime: '2026-10-20T08:06:00.000Z',
      command: 'python -m http.server 8080',
      executablePath: 'C:\\Python312\\python.exe',
      workingDirectory: 'C:\\Temp',
    },
  ]);

  try {
    h.supervisor.saveProject({
      id: 'app-alpha',
      name: 'App Alpha',
      rootPath: 'C:\\Users\\Justin Reyes\\Projects\\App Alpha',
      expectedPorts: [3000, 8080],
      launchExecutable: 'C:\\Program Files\\nodejs\\node.exe',
      launchArgs: ['server.js'],
    });

    h.supervisor.saveProject({
      id: 'app-beta',
      name: 'App Beta',
      rootPath: 'C:\\Users\\Justin Reyes\\Projects\\App Beta',
      expectedPorts: [4000, 8080],
      launchExecutable: 'C:\\Program Files\\nodejs\\node.exe',
      launchArgs: ['index.js'],
    });

    const dash = h.supervisor.inspectDashboard();
    const m3000 = dash.portMatches.find((m) => m.port === 3000);
    assert.equal(m3000.confidence, OwnershipConfidence.PATH_AND_PORT);
    assert.equal(m3000.primaryProject.id, 'app-alpha');

    // Port 8080 is configured for BOTH App Alpha and App Beta, while running an unrelated python server
    const m8080 = dash.portMatches.find((m) => m.port === 8080);
    assert.equal(m8080.confidence, OwnershipConfidence.AMBIGUOUS_CONFLICT);
    assert.equal(m8080.conflictProjects.length, 2);
    assert.match(m8080.explanation, /Port conflict on 8080/);
  } finally {
    h.cleanup();
  }
});

test('Milestone 3: Stop action re-verifies process identity and rejects stale selection when PID is reused', () => {
  const h = createTestHarness([
    {
      port: 3000,
      pid: 7001,
      processStartTime: '2026-10-20T08:10:00.000Z',
      command: 'node server.js',
      executablePath: 'C:\\Program Files\\nodejs\\node.exe',
      workingDirectory: 'C:\\Projects\\web',
    },
  ]);

  try {
    // 1. User previews stopping port 3000 (PID 7001)
    const preview = h.supervisor.previewStopByPort(3000);
    assert.equal(preview.canStop, true);
    assert.equal(preview.pid, 7001);

    // 2. Before user confirms, PID 7001 exits and the OS assigns PID 7001 to a new process!
    h.adapter.simulatePidReuseRace(7001, {
      newCommand: 'C:\\Windows\\System32\\svchost.exe',
      newExecutablePath: 'C:\\Windows\\System32\\svchost.exe',
      newStartTime: '2026-10-20T08:10:09.000Z',
    });

    // 3. User confirms stop -> Supervisor MUST reject the stale selection!
    const stopRes = h.supervisor.executeConfirmedStop(preview);
    assert.equal(stopRes.ok, false);
    assert.equal(stopRes.code, 'IDENTITY_MISMATCH_PID_REUSED');
    assert.match(stopRes.message, /PID Reuse Protection/);

    // Verify replacement process was NOT killed
    assert.ok(h.adapter.getProcessByPid(7001));
  } finally {
    h.cleanup();
  }
});

test('Milestone 3: Refuses stop when OS adapter cannot enforce identity binding or when privileges are denied', () => {
  const h = createTestHarness([
    {
      port: 3000,
      pid: 7200,
      processStartTime: '2026-10-20T08:12:00.000Z',
      command: 'node app.js',
      executablePath: 'node',
      workingDirectory: '/app',
    },
    {
      port: 443,
      pid: 400,
      accessDenied: true,
    },
  ]);

  try {
    // Access denied port cannot be stopped
    const deniedPreview = h.supervisor.previewStopByPort(443);
    assert.equal(deniedPreview.canStop, false);
    assert.match(deniedPreview.reason, /OS privilege boundaries/);

    // When adapter does not support identity binding, stop is disabled and read-only inspection is retained
    h.adapter.enforceIdentityBindingSupported = false;
    const unsupportedPreview = h.supervisor.previewStopByPort(3000);
    assert.equal(unsupportedPreview.canStop, false);
    assert.match(unsupportedPreview.reason, /cannot guarantee identity-bound process termination/);
  } finally {
    h.cleanup();
  }
});

test('Milestone 3: Controlled restart is strictly allowed for PortPilot-managed runs and refused for external processes', () => {
  const h = createTestHarness([
    {
      port: 3000,
      pid: 8001,
      processStartTime: '2026-10-20T08:15:00.000Z',
      command: 'node external-server.js',
      executablePath: 'C:\\Program Files\\nodejs\\node.exe',
      workingDirectory: 'C:\\Users\\Justin Reyes\\Projects\\Storefront App',
    },
  ]);

  try {
    h.supervisor.saveProject({
      id: 'storefront',
      name: 'Storefront App',
      rootPath: 'C:\\Users\\Justin Reyes\\Projects\\Storefront App',
      expectedPorts: [3000, 3005],
      launchExecutable: 'C:\\Program Files\\nodejs\\node.exe',
      launchArgs: ['C:\\Users\\Justin Reyes\\Projects\\Storefront App\\dev.js', '--port', '3005'],
    });

    // Attempt to restart external process on 3000 -> MUST be refused!
    const externalRestart = h.supervisor.restartByPort(3000);
    assert.equal(externalRestart.ok, false);
    assert.equal(externalRestart.code, 'UNMANAGED_PROCESS_RESTART_REFUSED');

    // Launch managed run on port 3005 (also verifies Windows paths with spaces in executable & args)
    const launchRes = h.supervisor.launchProject('storefront', { preferredPort: 3005 });
    assert.equal(launchRes.ok, true);
    const firstPid = launchRes.run.pid;
    assert.deepEqual(launchRes.run.launchArgs, [
      'C:\\Users\\Justin Reyes\\Projects\\Storefront App\\dev.js',
      '--port',
      '3005',
    ]);

    // Restart managed run on port 3005 -> MUST succeed and issue a new PID!
    const managedRestart = h.supervisor.restartByPort(3005);
    assert.equal(managedRestart.ok, true);
    assert.equal(managedRestart.code, 'MANAGED_RUN_RESTARTED');
    assert.equal(managedRestart.previousPid, firstPid);
    assert.notEqual(managedRestart.newRun.pid, firstPid);
  } finally {
    h.cleanup();
  }
});

test('Milestone 4: Daily ergonomics - occupied port check, failed launch resilience, child exit reconciliation, undo, export/import, and .bak recovery', () => {
  const h = createTestHarness([]);

  try {
    // 1. Save two projects and test single-step undo
    h.supervisor.saveProject({
      id: 'proj-1',
      name: 'Project One',
      rootPath: 'C:\\Projects\\One',
      expectedPorts: [5000],
      launchExecutable: 'node',
      launchArgs: ['index.js'],
      favorite: true,
    });
    h.supervisor.saveProject({
      id: 'proj-2',
      name: 'Project Two Accidental',
      rootPath: 'C:\\Projects\\Two',
      expectedPorts: [5001],
      launchExecutable: 'node',
      launchArgs: ['index.js'],
    });

    assert.equal(h.store.load().projects.length, 2);
    h.store.undoLastProjectEdit();
    assert.equal(h.store.load().projects.length, 1);
    assert.equal(h.store.load().projects[0].id, 'proj-1');

    // 2. Failed launch produces actionable message and leaves registry intact
    h.adapter.failNextLaunchReason = 'ENOENT: executable not found at specified path';
    const failedLaunch = h.supervisor.launchProject('proj-1');
    assert.equal(failedLaunch.ok, false);
    assert.equal(failedLaunch.code, 'LAUNCH_SPAWN_ERROR');
    assert.match(failedLaunch.message, /ENOENT/);
    assert.equal(h.store.load().projects.length, 1);

    // 3. Successful launch followed by occupied port prevention
    const okLaunch = h.supervisor.launchProject('proj-1');
    assert.equal(okLaunch.ok, true);
    const occupiedAttempt = h.supervisor.launchProject('proj-1');
    assert.equal(occupiedAttempt.ok, false);
    assert.equal(occupiedAttempt.code, 'PORT_ALREADY_OCCUPIED');

    // 4. Child process unexpected exit is reconciled on next dashboard inspection
    h.adapter.simulateProcessExit(okLaunch.run.pid, 1);
    const dashAfterExit = h.supervisor.inspectDashboard();
    const exitedRunRecord = dashAfterExit.recentRuns.find((r) => r.runId === okLaunch.run.runId);
    assert.equal(exitedRunRecord.status, 'exited');

    // 5. Export and Import round-trip
    const exportedJson = h.store.exportProfilesJson();
    h.store.removeProject('proj-1');
    assert.equal(h.store.load().projects.length, 0);
    h.store.importProfilesJson(exportedJson, { merge: false });
    assert.equal(h.store.load().projects.length, 1);

    // 6. Partial write / corrupted primary file automatically recovers from .bak
    fs.writeFileSync(h.registryPath, '{corrupted-partial-write...', 'utf8');
    const recoveredState = h.store.load();
    assert.equal(recoveredState.projects.length, 1);
    assert.match(h.store.lastRecoveryNotice, /Recovered registry from backup/);
  } finally {
    h.cleanup();
  }
});

test('End-to-End Beta Task Walkthrough executes cleanly and renders UI frames', () => {
  const output = runBetaTaskWalkthrough();
  assert.match(output, /BlueSky Web App/);
  assert.match(output, /GeoBrains Auth API/);
  assert.match(output, /CONFLICT\(2\)/);
  assert.match(output, /Restarted "BlueSky Web App" on port 3000/);
});
