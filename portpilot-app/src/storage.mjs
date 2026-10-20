/**
 * @fileoverview PortPilot Versioned Local Storage & Atomic Persistence (Milestones 2 & 4)
 * Implements Schema v1, atomic write recovery (.tmp + rename, .bak fallback),
 * single-step undo of registry edits, and configuration import/export.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_VERSION, validateProjectInput } from './domain.mjs';

export class RegistryStore {
  /**
   * @param {string} filePath - Path to the versioned JSON registry file.
   */
  constructor(filePath) {
    this.filePath = filePath;
    this.tmpPath = `${filePath}.tmp`;
    this.bakPath = `${filePath}.bak`;
    this.undoSnapshot = null;
    this.lastRecoveryNotice = null;
  }

  /**
   * Creates an empty default state structure.
   */
  createDefaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      projects: [],
      managedRuns: [],
    };
  }

  /**
   * Loads state from disk, automatically recovering from .bak if a partial write corrupted the primary file.
   */
  load() {
    this.lastRecoveryNotice = null;
    if (!fs.existsSync(this.filePath)) {
      if (fs.existsSync(this.bakPath)) {
        const recovered = this._readAndValidateJson(this.bakPath);
        this.lastRecoveryNotice = 'Recovered registry state from backup (.bak) after missing primary file.';
        this._writeAtomically(recovered);
        return recovered;
      }
      return this.createDefaultState();
    }

    try {
      return this._readAndValidateJson(this.filePath);
    } catch (primaryErr) {
      if (fs.existsSync(this.bakPath)) {
        try {
          const recovered = this._readAndValidateJson(this.bakPath);
          this.lastRecoveryNotice = `Recovered registry from backup (.bak) after primary file parse failure: ${primaryErr.message}`;
          this._writeAtomically(recovered);
          return recovered;
        } catch (bakErr) {
          throw new Error(
            `Registry file is corrupted (${primaryErr.message}) and backup recovery failed (${bakErr.message}).`
          );
        }
      }
      throw new Error(`Registry file could not be loaded: ${primaryErr.message}`);
    }
  }

  /**
   * Validates parsed JSON against Schema v1 boundaries.
   */
  _readAndValidateJson(targetPath) {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Root config must be a JSON object.');
    }
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `Unsupported schemaVersion "${parsed.schemaVersion}". Expected version ${SCHEMA_VERSION}.`
      );
    }
    if (!Array.isArray(parsed.projects)) {
      throw new Error('Config "projects" must be an array.');
    }
    const validatedProjects = parsed.projects.map((p) => validateProjectInput(p));
    const managedRuns = Array.isArray(parsed.managedRuns) ? parsed.managedRuns : [];
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      projects: validatedProjects,
      managedRuns,
    };
  }

  /**
   * Writes state atomically via .tmp file + rename + verified .bak mirror.
   */
  _writeAtomically(state) {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });

    const payload = JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        projects: state.projects,
        managedRuns: state.managedRuns,
      },
      null,
      2
    );

    // 1. Write complete payload to .tmp
    fs.writeFileSync(this.tmpPath, payload, { encoding: 'utf8', flag: 'w' });

    // 2. Atomic rename .tmp -> primary
    fs.renameSync(this.tmpPath, this.filePath);

    // 3. Mirror verified primary commit to .bak for partial-write / corruption recovery
    fs.copyFileSync(this.filePath, this.bakPath);
  }

  /**
   * Saves a project (add or update) while preserving an undo snapshot of the project list.
   */
  upsertProject(projectInput) {
    const state = this.load();
    const validated = validateProjectInput(projectInput);
    this.undoSnapshot = JSON.parse(JSON.stringify(state.projects));

    const idx = state.projects.findIndex((p) => p.id === validated.id);
    if (idx >= 0) {
      validated.createdAt = state.projects[idx].createdAt;
      state.projects[idx] = validated;
    } else {
      state.projects.push(validated);
    }

    this._writeAtomically(state);
    return validated;
  }

  /**
   * Deletes a project by ID while keeping an undo snapshot.
   */
  removeProject(projectId) {
    const state = this.load();
    const existing = state.projects.find((p) => p.id === projectId);
    if (!existing) {
      throw new Error(`Project "${projectId}" not found in registry.`);
    }
    this.undoSnapshot = JSON.parse(JSON.stringify(state.projects));
    state.projects = state.projects.filter((p) => p.id !== projectId);
    this._writeAtomically(state);
    return existing;
  }

  /**
   * Toggles favorite status on a project.
   */
  toggleFavorite(projectId) {
    const state = this.load();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project "${projectId}" not found in registry.`);
    }
    this.undoSnapshot = JSON.parse(JSON.stringify(state.projects));
    project.favorite = !project.favorite;
    project.updatedAt = new Date().toISOString();
    this._writeAtomically(state);
    return project;
  }

  /**
   * Restores the previous project registry state before the last edit (Milestone 4).
   */
  undoLastProjectEdit() {
    if (!this.undoSnapshot) {
      throw new Error('No recent project registry edit is available to undo.');
    }
    const state = this.load();
    const currentSnapshot = JSON.parse(JSON.stringify(state.projects));
    state.projects = this.undoSnapshot;
    this.undoSnapshot = currentSnapshot;
    this._writeAtomically(state);
    return state.projects;
  }

  /**
   * Records or updates a ManagedRun entry (only actions PortPilot actually performed).
   */
  recordManagedRun(runEntry) {
    const state = this.load();
    const idx = state.managedRuns.findIndex((r) => r.runId === runEntry.runId);
    if (idx >= 0) {
      state.managedRuns[idx] = { ...state.managedRuns[idx], ...runEntry };
    } else {
      state.managedRuns.unshift(runEntry);
    }
    this._writeAtomically(state);
    return runEntry;
  }

  /**
   * Exports portable project profiles as a formatted JSON string (excludes ephemeral machine PIDs).
   */
  exportProfilesJson() {
    const state = this.load();
    return JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        projects: state.projects,
      },
      null,
      2
    );
  }

  /**
   * Imports portable project profiles from a JSON string, validating every entry before saving.
   */
  importProfilesJson(rawJson, { merge = true } = {}) {
    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      throw new Error(`Invalid import JSON: ${err.message}`);
    }
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.projects)) {
      throw new Error(`Import payload must have schemaVersion=${SCHEMA_VERSION} and a "projects" array.`);
    }
    const incoming = parsed.projects.map((p) => validateProjectInput(p));
    const state = this.load();
    this.undoSnapshot = JSON.parse(JSON.stringify(state.projects));

    if (!merge) {
      state.projects = incoming;
    } else {
      for (const proj of incoming) {
        const idx = state.projects.findIndex((existing) => existing.id === proj.id);
        if (idx >= 0) {
          state.projects[idx] = proj;
        } else {
          state.projects.push(proj);
        }
      }
    }

    this._writeAtomically(state);
    return state.projects;
  }
}
