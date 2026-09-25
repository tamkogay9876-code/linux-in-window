// Apply pipeline: merge enabled packages -> write WT settings -> track conflicts.
// run/stop/open: manage runtime state + launch Windows Terminal.

import fs from 'node:fs';
import path from 'node:path';
import { paths, readJsonSafe, writeJson } from './storage.js';
import { effectiveConfig, buildWtContribution, writeEffectiveConfig } from './theme.js';
import { loadBaseWtSettings, mergeWtContributions, applyWtSettings, launchWindowsTerminal } from './wt.js';
import { getPackageState, setPackageState, appendLog, loadSettings, activeProfile, loadProfiles } from './state.js';
import { createBackup } from './backup.js';
import { restore } from './backup.js';

/**
 * Recompute the effective configuration and push it to Windows Terminal.
 * Returns { merged, conflicts, applied }.
 */
export function applyAll({ dryRun = false } = {}) {
  const settings = loadSettings();
  const cfg = effectiveConfig({ safeMode: settings.safeMode });
  const contributions = [];
  for (const c of cfg.contributions) {
    if (!c.theme && !c.nox) continue;
    contributions.push(buildWtContribution(c.id, perPackageMerged(c)));
  }
  const base = loadBaseWtSettings();
  const { settings: mergedWt, conflicts: wtConflicts } = mergeWtContributions(base, contributions);
  const applied = applyWtSettings(mergedWt, { dryRun });
  if (!dryRun) {
    writeEffectiveConfig(cfg);
    writeJson(paths.configs('conflicts.json'), cfg.conflicts);
  }
  return { merged: cfg.merged, conflicts: [...cfg.conflicts, ...wtConflicts], applied };
}

function perPackageMerged(contribution) {
  // Build a "merged-like" object from a single package's theme so buildWtContribution works per-package.
  const t = contribution.theme || {};
  return {
    scheme: t.scheme || null,
    profile: t.profile || null,
    font: t.font || {},
    background: t.background || {},
  };
}

/** linux run <package>: mark running, apply config, open WT with its profile. */
export async function runPackage(id) {
  const st = getPackageState(id);
  if (!st) throw new Error(`not installed: ${id}`);
  if (st.status === 'disabled') throw new Error(`${id} is disabled. Run "linux enable ${id}" first.`);
  const dir = paths.packages(id);
  const manifest = readJsonSafe(path.join(dir, 'package.json'), {});
  const theme = readJsonSafe(path.join(dir, 'theme', 'theme.json'), {});
  const profileName = theme?.profile?.name || manifest.name || id;

  setPackageState(id, { status: 'running' });
  appendLog(id, 'info', `run requested (profile "${profileName}")`);
  const result = await launchWindowsTerminal(profileName);
  if (!result.ok) appendLog(id, 'warn', `launch failed: ${result.error}; configuration was still applied`);
  return { ok: true, id, profile: profileName, launch: result };
}

export function stopPackage(id) {
  const st = getPackageState(id);
  if (!st) throw new Error(`not installed: ${id}`);
  setPackageState(id, { status: 'stopped' });
  appendLog(id, 'info', 'stopped');
  return { ok: true, id };
}

export function restartPackage(id) {
  stopPackage(id);
  return runPackage(id);
}

export function enablePackage(id) {
  setPackageState(id, { status: 'installed' });
  appendLog(id, 'info', 'enabled');
  return applyAll();
}

export function disablePackage(id) {
  setPackageState(id, { status: 'disabled' });
  appendLog(id, 'info', 'disabled');
  return applyAll();
}

/** Rollback: restore latest backup (or given id), re-apply config afterwards. */
export function rollback(backupId = null) {
  const manifest = restore(backupId);
  try { applyAll(); } catch { /* best effort */ }
  return manifest;
}

/** Switch profile and re-apply only that profile's packages (others are disabled). */
export function useProfileAndApply(name) {
  const profiles = loadProfiles();
  if (!profiles[name]) throw new Error(`no such profile: ${name}`);
  const settings = loadSettings();
  settings.activeProfile = name;
  writeJson(paths.settings('settings.json'), settings);

  const include = new Set(profiles[name].packages);
  const state = readJsonSafe(paths.settings('state.json'), {});
  for (const [id, st] of Object.entries(state)) {
    if (st.status === 'running' || st.status === 'installed') {
      st.status = include.has(id) ? 'installed' : 'disabled';
    }
  }
  writeJson(paths.settings('state.json'), state);
  createBackup(`profile-switch:${name}`);
  return applyAll();
}

// ---- export / import setup ------------------------------------------------------

export function exportProfile(name, outFile) {
  const profiles = loadProfiles();
  const prof = profiles[name];
  if (!prof) throw new Error(`no such profile: ${name}`);
  const payload = {
    format: 'linuxprofile',
    version: 1,
    name,
    description: prof.description,
    createdAt: new Date().toISOString(),
    packages: prof.packages.map((id) => {
      const st = getPackageState(id);
      return { id, version: st?.version };
    }),
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  writeJson(outFile, payload);
  return outFile;
}

export async function importProfile(file, opts = {}) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (payload.format !== 'linuxprofile') throw new Error('not a .linuxprofile file');
  const results = [];
  for (const p of payload.packages) {
    try {
      await installSafely(p.id, opts);
      results.push({ id: p.id, ok: true });
    } catch (e) {
      results.push({ id: p.id, ok: false, error: e.message });
    }
  }
  // recreate profile locally
  const profiles = loadProfiles();
  profiles[payload.name] = { description: payload.description || '', packages: payload.packages.map((p) => p.id) };
  writeJson(paths.settings('profiles.json'), profiles);
  return { name: payload.name, results };
}

async function installSafely(id, opts) {
  // late import to avoid cycles
  const { install } = await import('./pkg-manager.js');
  return install(id, opts);
}
