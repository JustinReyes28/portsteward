/**
 * @fileoverview PortPilot Domain Model & Matching Rules (Milestones 1, 2, 3, 4)
 * Separates domain logic from UI, persistence, and OS adapters.
 */

export const SCHEMA_VERSION = 1;

/**
 * Valid ownership confidence tiers.
 * Never guesses ownership when evidence is incomplete or conflicting.
 */
export const OwnershipConfidence = Object.freeze({
  EXACT_MANAGED: 'exact-managed',         // Launched by PortPilot with matching PID + startTime
  PATH_AND_PORT: 'path-and-port',         // Process path/cwd resides inside project rootPath AND port matches
  PORT_ONLY: 'port-only',                 // Port matches single project's expectedPorts, path unverified
  AMBIGUOUS_CONFLICT: 'ambiguous-conflict', // Multiple projects claim this port/path
  UNMATCHED: 'unmatched',                 // Active listener not matching any registered project
  ACCESS_DENIED: 'access-denied',         // Port active, but OS denied process identity inspection
});

/**
 * Normalizes file paths across Windows and POSIX for safe comparison without altering spaces.
 * @param {string} rawPath
 * @returns {string}
 */
export function normalizePathForComparison(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  // Windows drive-letter paths are compared case-insensitively
  if (/^[a-zA-Z]:(\/|$)/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

/**
 * Checks whether an observed process path or command references a project's rootPath.
 * Preserves exact boundaries so "C:/Apps/web" does not falsely match "C:/Apps/web-admin".
 * @param {string} rootPath
 * @param {object} observation
 * @returns {boolean}
 */
export function doesObservationMatchProjectPath(rootPath, observation) {
  const normRoot = normalizePathForComparison(rootPath);
  if (!normRoot) return false;

  const candidates = [
    observation.workingDirectory,
    observation.executablePath,
    observation.command,
  ].filter(Boolean);

  for (const rawCandidate of candidates) {
    const normCand = normalizePathForComparison(String(rawCandidate));
    if (normCand === normRoot || normCand.startsWith(normRoot + '/')) {
      return true;
    }
    // Check quoted or embedded path token inside command line
    const idx = normCand.indexOf(normRoot);
    if (idx !== -1) {
      const afterChar = normCand[idx + normRoot.length];
      if (!afterChar || afterChar === '/' || afterChar === '"' || afterChar === "'" || afterChar === ' ') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Validates and constructs a Project entity.
 * Treats saved config as untrusted user input and preserves executable/arg boundaries.
 * @param {object} input
 * @returns {object}
 */
export function validateProjectInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Project configuration must be an object.');
  }
  const id = String(input.id || '').trim();
  const name = String(input.name || '').trim();
  const rootPath = String(input.rootPath || '').trim();
  const launchExecutable = String(input.launchExecutable || '').trim();

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Project "id" must be a non-empty alphanumeric/hyphen/underscore identifier.');
  }
  if (!name) {
    throw new Error('Project "name" is required.');
  }
  if (!rootPath) {
    throw new Error('Project "rootPath" is required.');
  }
  if (!launchExecutable) {
    throw new Error('Project "launchExecutable" is required.');
  }
  if (!Array.isArray(input.expectedPorts) || input.expectedPorts.length === 0) {
    throw new Error('Project "expectedPorts" must be a non-empty array of valid TCP port numbers (1-65535).');
  }

  const expectedPorts = [];
  for (const p of input.expectedPorts) {
    const portNum = Number(p);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error(`Invalid port number "${p}" in project "${name}". Must be an integer between 1 and 65535.`);
    }
    if (!expectedPorts.includes(portNum)) {
      expectedPorts.push(portNum);
    }
  }

  const launchArgs = Array.isArray(input.launchArgs)
    ? input.launchArgs.map((arg) => String(arg))
    : [];

  return {
    id,
    name,
    rootPath,
    expectedPorts,
    launchExecutable,
    launchArgs,
    favorite: Boolean(input.favorite),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Matches a single port observation against registered projects and active managed runs.
 * Milestone 1 & Milestone 2 core domain rule:
 * - Separates observed process identity from saved project configuration.
 * - Surfaces conflicts explicitly when multiple registry entries match.
 * - Never presents guessed ownership as fact when privileges are missing.
 *
 * @param {object} observation
 * @param {Array<object>} projects
 * @param {Array<object>} managedRuns
 * @returns {object}
 */
export function evaluateObservationOwnership(observation, projects, managedRuns = []) {
  const port = observation.port;
  const portClaimants = projects.filter((proj) => proj.expectedPorts.includes(port));

  // 1. Check if OS denied process details
  if (observation.accessDenied || !observation.pid) {
    return {
      port,
      observation,
      matchedProjects: portClaimants,
      primaryProject: null,
      managedRun: null,
      confidence: OwnershipConfidence.ACCESS_DENIED,
      conflictProjects: portClaimants.length > 1 ? portClaimants : [],
      explanation:
        portClaimants.length > 0
          ? `Port ${port} is configured for ${portClaimants.map((p) => p.name).join(', ')}, but OS privileges prevented reading process identity. Ownership is not verified.`
          : `Port ${port} has an active listener, but OS privileges prevented reading process identity.`,
    };
  }

  // 2. Check if this exact process is an active ManagedRun started by PortPilot
  const matchingRun = managedRuns.find(
    (run) =>
      run.status === 'running' &&
      run.pid === observation.pid &&
      run.processStartTime &&
      observation.processStartTime &&
      run.processStartTime === observation.processStartTime
  );

  if (matchingRun) {
    const ownerProject = projects.find((p) => p.id === matchingRun.projectId) || null;
    const otherClaimants = portClaimants.filter((p) => p.id !== matchingRun.projectId);
    return {
      port,
      observation,
      matchedProjects: ownerProject ? [ownerProject, ...otherClaimants] : portClaimants,
      primaryProject: ownerProject,
      managedRun: matchingRun,
      confidence: OwnershipConfidence.EXACT_MANAGED,
      conflictProjects: otherClaimants,
      explanation:
        otherClaimants.length > 0
          ? `Verified managed run (${matchingRun.runId}) for "${ownerProject?.name || matchingRun.projectId}" (PID ${observation.pid}). Note: Port ${port} is also listed in ${otherClaimants.map((p) => p.name).join(', ')}.`
          : `Verified managed run (${matchingRun.runId}) launched by PortPilot for "${ownerProject?.name || matchingRun.projectId}".`,
    };
  }

  // 3. Check path + port matches among registered projects
  const pathAndPortMatches = portClaimants.filter((proj) =>
    doesObservationMatchProjectPath(proj.rootPath, observation)
  );

  if (pathAndPortMatches.length === 1) {
    const primary = pathAndPortMatches[0];
    const otherPortClaimants = portClaimants.filter((p) => p.id !== primary.id);
    return {
      port,
      observation,
      matchedProjects: [primary, ...otherPortClaimants],
      primaryProject: primary,
      managedRun: null,
      confidence: OwnershipConfidence.PATH_AND_PORT,
      conflictProjects: otherPortClaimants,
      explanation:
        otherPortClaimants.length > 0
          ? `Observed process path and port ${port} match "${primary.name}" (external process, not launched by PortPilot). Conflict: Port ${port} is also expected by ${otherPortClaimants.map((p) => p.name).join(', ')}.`
          : `Observed process path and port ${port} match "${primary.name}" (external process, not launched by PortPilot).`,
    };
  }

  if (pathAndPortMatches.length > 1) {
    return {
      port,
      observation,
      matchedProjects: pathAndPortMatches,
      primaryProject: null,
      managedRun: null,
      confidence: OwnershipConfidence.AMBIGUOUS_CONFLICT,
      conflictProjects: pathAndPortMatches,
      explanation: `Ambiguous ownership on port ${port}: multiple projects match both port and path (${pathAndPortMatches.map((p) => p.name).join(', ')}). Inspect PID ${observation.pid} before acting.`,
    };
  }

  // 4. Port-only claimants (path does not match or is unavailable)
  if (portClaimants.length > 1) {
    return {
      port,
      observation,
      matchedProjects: portClaimants,
      primaryProject: null,
      managedRun: null,
      confidence: OwnershipConfidence.AMBIGUOUS_CONFLICT,
      conflictProjects: portClaimants,
      explanation: `Port conflict on ${port}: configured for multiple projects (${portClaimants.map((p) => p.name).join(', ')}), while actual listener is PID ${observation.pid} (${observation.command || 'unknown command'}).`,
    };
  }

  if (portClaimants.length === 1) {
    const candidate = portClaimants[0];
    return {
      port,
      observation,
      matchedProjects: [candidate],
      primaryProject: candidate,
      managedRun: null,
      confidence: OwnershipConfidence.PORT_ONLY,
      conflictProjects: [],
      explanation: `Port ${port} matches "${candidate.name}" configuration, but observed process path (${observation.workingDirectory || observation.executablePath || 'unreported'}) was not verified against "${candidate.rootPath}".`,
    };
  }

  // 5. Unmatched listener
  return {
    port,
    observation,
    matchedProjects: [],
    primaryProject: null,
    managedRun: null,
    confidence: OwnershipConfidence.UNMATCHED,
    conflictProjects: [],
    explanation: `Unregistered listener on port ${port} (PID ${observation.pid}: ${observation.command || 'unknown'}). Not associated with any saved project.`,
  };
}
