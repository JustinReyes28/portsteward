/**
 * @fileoverview PortPilot Terminal UI Renderer (Phase 2 & Phase 3)
 * Renders Projects, Ports, Details/Action Preview, and Launch History views
 * across Normal, Empty, Loading, Failure, Cancelled, and Completed states.
 */

/**
 * Renders the complete Terminal UI frame for inspection, walkthroughs, and snapshots.
 */
export function renderDashboardFrame(dashboard, {
  activeTab = 'PORTS',
  uiState = 'NORMAL',
  selectedPort = null,
  actionPreview = null,
  bannerMessage = null,
  theme = 'dark',
  width = 88,
} = {}) {
  const hr = '─'.repeat(width - 2);
  const top = `┌${hr}┐`;
  const mid = `├${hr}┤`;
  const bot = `└${hr}┘`;
  const pad = (str) => {
    const clean = String(str || '').slice(0, width - 4);
    return `│ ${clean.padEnd(width - 4, ' ')} │`;
  };

  const lines = [
    top,
    pad(`PortPilot v0.1.0-alpha.1  |  Theme: ${theme.toUpperCase()}  |  State: ${uiState}`),
    pad(`Tabs: [1] Projects (${dashboard.projects.length})   [2] Live Ports (${dashboard.portMatches.length})   [3] Details   [4] Launch History (${dashboard.recentRuns.length})`),
    mid,
  ];

  if (dashboard.recoveryNotice) {
    lines.push(pad(`[!] STORAGE RECOVERY: ${dashboard.recoveryNotice}`));
    lines.push(mid);
  }

  if (bannerMessage) {
    lines.push(pad(`[STATUS] ${bannerMessage}`));
    lines.push(mid);
  }

  if (uiState === 'LOADING') {
    lines.push(pad('Refreshing OS port listeners and validating process start-time tokens...'));
    lines.push(bot);
    return lines.join('\n');
  }

  // Section 1: Saved Projects Registry
  lines.push(pad('SAVED PROJECTS REGISTRY:'));
  if (dashboard.projects.length === 0) {
    lines.push(pad('  (Empty) No development projects registered yet. Press [A] to add a project.'));
  } else {
    for (const proj of dashboard.projects) {
      const star = proj.favorite ? '★' : ' ';
      const ports = proj.expectedPorts.join(', ');
      lines.push(pad(`  ${star} [${proj.id}] ${proj.name.padEnd(20)} Ports: ${ports.padEnd(10)} Path: ${proj.rootPath}`));
    }
  }
  lines.push(mid);

  // Section 2: Live Port Ownership View
  lines.push(pad('LIVE PORT LISTENERS & OWNERSHIP CONFIDENCE:'));
  if (dashboard.portMatches.length === 0) {
    lines.push(pad('  (Empty) No active TCP listeners detected on monitored ports.'));
  } else {
    lines.push(pad('  PORT   PID     CONFIDENCE           PROJECT OWNER          COMMAND'));
    for (const match of dashboard.portMatches) {
      const marker = selectedPort === match.port ? '>' : ' ';
      const portStr = String(match.port).padEnd(6);
      const pidStr = (match.observation.pid ? String(match.observation.pid) : 'DENIED').padEnd(7);
      const confStr = match.confidence.padEnd(20);
      const ownerStr = (
        match.conflictProjects.length > 1
          ? `CONFLICT(${match.conflictProjects.length})`
          : match.primaryProject?.name || '(Unregistered)'
      ).slice(0, 21).padEnd(22);
      const cmdStr = (match.observation.command || '<access denied>').slice(0, 24);
      lines.push(pad(`${marker} ${portStr} ${pidStr} ${confStr} ${ownerStr} ${cmdStr}`));
    }
  }
  lines.push(mid);

  // Section 3: Process Details & Deliberate Action Preview
  if (actionPreview) {
    lines.push(pad(`ACTION PREVIEW (Port ${actionPreview.port}):`));
    lines.push(pad(`  Project: ${actionPreview.projectName || 'Unregistered'}  |  Confidence: ${actionPreview.confidence || 'N/A'}`));
    lines.push(pad(`  Target PID: ${actionPreview.pid ?? 'N/A'}  |  Start Time: ${actionPreview.processStartTime || 'Unavailable'}`));
    lines.push(pad(`  Command: ${actionPreview.command || 'Unavailable'}`));
    lines.push(pad(`  Policy: ${actionPreview.restartPolicyNote || actionPreview.reason}`));
    lines.push(pad(`  Controls: [Enter] Confirm Identity-Bound Stop   ${actionPreview.canRestart ? '[R] Controlled Restart   ' : ''}[Esc] Cancel`));
    lines.push(mid);
  }

  // Section 4: Managed Launch History (Only actions performed by PortPilot)
  lines.push(pad('MANAGED LAUNCH HISTORY (Tool-Performed Actions Only):'));
  if (dashboard.recentRuns.length === 0) {
    lines.push(pad('  (Empty) PortPilot has not launched any servers in this session.'));
  } else {
    for (const run of dashboard.recentRuns.slice(0, 4)) {
      const pidInfo = run.pid ? `PID ${run.pid}` : 'No PID';
      const errInfo = run.lastError ? ` - ${run.lastError}` : '';
      lines.push(pad(`  • [${run.status.toUpperCase()}] ${run.projectName} (Port ${run.port}, ${pidInfo})${errInfo}`));
    }
  }

  lines.push(mid);
  lines.push(pad('Keys: [↑/↓] Select  [S] Preview Stop  [L] Launch Profile  [R] Restart Managed  [U] Undo  [Q] Quit'));
  lines.push(bot);
  return lines.join('\n');
}
