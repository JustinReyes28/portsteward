import path from 'node:path';
export const SCHEMA_VERSION = 1;
export const OwnershipConfidence = Object.freeze({
  EXACT_MANAGED:'exact-managed', PATH_AND_PORT:'path-and-port', PORT_ONLY:'port-only',
  AMBIGUOUS_CONFLICT:'ambiguous-conflict', UNMATCHED:'unmatched', ACCESS_DENIED:'access-denied'
});
export function normalizePathForComparison(value) {
  if(typeof value!=='string' || !value) return '';
  const windows = /^[a-z]:[\\/]/i.test(value) || /^\\\\/.test(value);
  const normalized=(windows?path.win32.normalize(value).toLowerCase():path.posix.normalize(value)).replace(/\\/g,'/');
  return normalized.replace(/\/+$/,'') || '/';
}
export function doesObservationMatchProjectPath(rootPath, observation) {
  const root=normalizePathForComparison(rootPath);
  if(!root)return false;
  const inside=value=>{
    const p=normalizePathForComparison(value);
    return p===root || p.startsWith(root.endsWith('/')?root:root+'/');
  };
  if([observation.workingDirectory,observation.executablePath].some(value=>value && inside(value)))return true;
  // Compare complete command tokens, never a substring of an arbitrary argument.
  const tokens=String(observation.command || '').match(/"[^"]*"|[^\s"]+/g)||[];
  return tokens.some(token=>inside(token.replace(/^"|"$/g,'')));
}
function requiredText(value,label) {
  if(typeof value!=='string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value))throw new Error(label+' must be non-empty text without control characters.');
  return value.trim();
}
export function validateProjectInput(input) {
  if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('Project configuration must be an object.');
  const id=requiredText(input.id,'Project id');
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw new Error('Project id must contain at most 80 letters, digits, hyphens or underscores.');
  const name=requiredText(input.name,'Project name');
  const rootPath=requiredText(input.rootPath,'Project rootPath');
  if(!path.win32.isAbsolute(rootPath) && !path.posix.isAbsolute(rootPath))throw new Error('Project rootPath must be absolute.');
  const launchExecutable=requiredText(input.launchExecutable,'Project launchExecutable');
  if(!Array.isArray(input.expectedPorts)||!input.expectedPorts.length||input.expectedPorts.some(p=>!Number.isInteger(p)||p<1||p>65535))throw new Error('Project expectedPorts must be an array of integer TCP ports (1–65535).');
  if(!Array.isArray(input.launchArgs)||input.launchArgs.some(arg=>typeof arg!=='string'||/[\u0000-\u001f\u007f]/.test(arg)))throw new Error('Project launchArgs must be an array of strings without control characters.');
  if(input.group!==undefined && (typeof input.group!=='string'||input.group.length>80||/[\u0000-\u001f\u007f]/.test(input.group)))throw new Error('Project group must be text of at most 80 characters.');
  if(input.favorite!==undefined && typeof input.favorite!=='boolean')throw new Error('Project favorite must be a boolean.');
  return {id,name,rootPath,expectedPorts:[...new Set(input.expectedPorts)],launchExecutable,launchArgs:[...input.launchArgs],favorite:input.favorite||false,group:input.group||'',createdAt:input.createdAt||new Date().toISOString(),updatedAt:input.updatedAt||new Date().toISOString()};
}
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
      primaryProject: null,
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
