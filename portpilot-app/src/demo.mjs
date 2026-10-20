#!/usr/bin/env node
/**
 * @fileoverview PortPilot CLI Entrypoint & End-to-End Beta Task Walkthrough (Phase 3)
 * Runs either live port inspection or the deterministic Phase 3 Beta Task walkthrough.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { RegistryStore } from './storage.mjs';
import { FakeOsAdapter, LiveOsAdapter } from './adapters.mjs';
import { PortPilotSupervisor } from './supervisor.mjs';
import { renderDashboardFrame } from './ui.mjs';

export async function runBetaTaskWalkthrough() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portpilot-walkthrough-'));
  const registryPath = path.join(tempDir, 'portpilot-registry.json');
  const store = new RegistryStore(registryPath);

  // Seed an external process occupying port 3000 and an access-denied system service on 5432
  const adapter = new FakeOsAdapter([
    {
      port: 3000,
      pid: 4820,
      processStartTime: '2026-10-20T07:50:00.000Z',
      command: 'node "C:\\Users\\Justin Reyes\\Projects\\legacy-prototype\\server.js" --port 3000',
      executablePath: 'C:\\Program Files\\nodejs\\node.exe',
      workingDirectory: 'C:\\Users\\Justin Reyes\\Projects\\legacy-prototype',
      accessDenied: false,
    },
    {
      port: 5432,
      pid: 940,
      accessDenied: true,
    },
  ]);

  const supervisor = new PortPilotSupervisor({ store, adapter });
  const logs = [];

  // Step 1: Register two sample apps (including Windows paths with spaces and a shared conflict port 3000)
  supervisor.saveProject({
    id: 'bluesky-web',
    name: 'BlueSky Web App',
    rootPath: 'C:\\Users\\Justin Reyes\\Projects\\BlueSky Bulletin',
    expectedPorts: [3000, 3001],
    launchExecutable: 'C:\\Program Files\\nodejs\\node.exe',
    launchArgs: ['C:\\Users\\Justin Reyes\\Projects\\BlueSky Bulletin\\dev-server.js', '--port', '3000'],
    favorite: true,
  });

  supervisor.saveProject({
    id: 'geobrains-api',
    name: 'GeoBrains Auth API',
    rootPath: 'C:\\Users\\Justin Reyes\\Projects\\GeoBrains API',
    expectedPorts: [3000, 4000],
    launchExecutable: 'C:\\Program Files\\nodejs\\node.exe',
    launchArgs: ['C:\\Users\\Justin Reyes\\Projects\\GeoBrains API\\index.js', '--port', '4000'],
    favorite: true,
  });

  // Step 2: Inspect occupied port 3000 (shows conflict between BlueSky Web App & GeoBrains Auth API vs actual listener)
  const initialDashboard = await supervisor.inspectDashboard();
  const preview3000 = await supervisor.previewStopByPort(3000);
  logs.push('=== STEP 1 & 2: REGISTER TWO SAMPLE APPS & IDENTIFY OCCUPIED PORT 3000 ===');
  logs.push(
    renderDashboardFrame(initialDashboard, {
      selectedPort: 3000,
      actionPreview: preview3000,
      bannerMessage: 'Port 3000 is occupied by external PID 4820; restart disabled for unmanaged process.',
    })
  );

  // Step 3: Stop the conflicting external process on port 3000 after identity re-verification, then launch BlueSky Web App from its profile
  const stopExternal = await supervisor.executeConfirmedStop(preview3000);
  const launchBlueSky = await supervisor.launchProject('bluesky-web', { preferredPort: 3000 });
  const launchGeoBrains = await supervisor.launchProject('geobrains-api', { preferredPort: 4000 });

  // Step 4: Restart ONLY the managed BlueSky Web App server on port 3000
  const restartBlueSky = await supervisor.restartByPort(3000);
  const finalDashboard = await supervisor.inspectDashboard();
  const finalPreview = await supervisor.previewStopByPort(3000);

  logs.push('\n=== STEP 3 & 4: LAUNCH FROM SAVED PROFILE & RESTART ONLY THAT MANAGED SERVER ===');
  logs.push(`• Stop external listener (port 3000): ${stopExternal.message}`);
  logs.push(`• Launch BlueSky Web App (port 3000): ${launchBlueSky.message}`);
  logs.push(`• Launch GeoBrains Auth API (port 4000): ${launchGeoBrains.message}`);
  logs.push(`• Controlled restart on port 3000: ${restartBlueSky.message}`);
  logs.push(
    renderDashboardFrame(finalDashboard, {
      selectedPort: 3000,
      actionPreview: finalPreview,
      uiState: 'COMPLETED',
      bannerMessage: restartBlueSky.message,
    })
  );

  fs.rmSync(tempDir, { recursive: true, force: true });
  return 'SIMULATED WALKTHROUGH — deterministic adapter, no real processes changed.\n'+logs.join('\n');
}
