// Windows Terminal integration.
// Reads/writes %LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal...\LocalState\settings.json
// Adds/updates color schemes and profiles contributed by installed packages.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { paths, readJsonSafe, writeJson } from './storage.js';

export function windowsTerminalSettingsPath() {
  if (process.env.LIW_WT_SETTINGS) return process.env.LIW_WT_SETTINGS;
  if (process.platform !== 'win32') return null;
  const pkgRoot = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'Packages'
  );
  if (!fs.existsSync(pkgRoot)) return null;
  for (const dir of fs.readdirSync(pkgRoot)) {
    if (/^Microsoft\.WindowsTerminal/i.test(dir)) {
      const candidate = path.join(pkgRoot, dir, 'LocalState', 'settings.json');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** Where we mirror the merged WT settings for inspection / preview. */
export function appliedWtPath() {
  return paths.configs('windows-terminal.settings.json');
}

export function loadBaseWtSettings() {
  const wtPath = windowsTerminalSettingsPath();
  if (wtPath && fs.existsSync(wtPath)) return readJsonSafe(wtPath, {}) || {};
  // fallback: our last applied copy, then a sane default skeleton
  return readJsonSafe(appliedWtPath(), null) || { profiles: { list: [] }, schemes: [] };
}

/**
 * Merge theme contributions into WT settings.
 * @param {object} base - base WT settings object
 * @param {Array<{id:string, scheme:object, profile:object}>} contributions
 * @returns {{settings:object, conflicts:Array}}
 */
export function mergeWtContributions(base, contributions) {
  const settings = structuredClone(base);
  settings.profiles = settings.profiles || {};
  settings.profiles.list = settings.profiles.list || [];
  settings.schemes = settings.schemes || [];

  const conflicts = [];
  const seenSchemeNames = new Map();

  for (const c of contributions) {
    if (c.scheme) {
      const name = c.scheme.name;
      if (seenSchemeNames.has(name) && seenSchemeNames.get(name) !== c.id) {
        conflicts.push({
          key: `scheme:${name}`,
          winner: seenSchemeNames.get(name),
          loser: c.id,
        });
        continue;
      }
      seenSchemeNames.set(name, c.id);
      const idx = settings.schemes.findIndex((s) => s.name === name);
      if (idx >= 0) settings.schemes[idx] = c.scheme;
      else settings.schemes.push(c.scheme);
    }
    if (c.profile) {
      const pname = c.profile.name;
      const existing = settings.profiles.list.find((p) => p.name === pname);
      if (existing && existing._liwSource && existing._liwSource !== c.id) {
        conflicts.push({ key: `profile:${pname}`, winner: existing._liwSource, loser: c.id });
        continue;
      }
      const profile = { ...c.profile, _liwSource: c.id, hidden: c.profile.hidden ?? false };
      const idx = settings.profiles.list.findIndex((p) => p.name === pname);
      if (idx >= 0) settings.profiles.list[idx] = profile;
      else settings.profiles.list.push(profile);
    }
  }
  return { settings, conflicts };
}

/**
 * Apply merged settings to disk (real WT settings.json when available,
 * always mirrored into configs/windows-terminal.settings.json).
 */
export function applyWtSettings(settings, { dryRun = false } = {}) {
  const mirrored = structuredClone(settings);
  // strip internal keys before writing
  if (mirrored.profiles?.list) {
    for (const p of mirrored.profiles.list) delete p._liwSource;
  }
  if (dryRun) return { written: false, mirror: appliedWtPath(), payload: mirrored };
  writeJson(appliedWtPath(), mirrored);
  const wtPath = windowsTerminalSettingsPath();
  if (wtPath) {
    fs.mkdirSync(path.dirname(wtPath), { recursive: true });
    fs.writeFileSync(wtPath, JSON.stringify(mirrored, null, 4), 'utf8');
    return { written: true, target: wtPath, mirror: appliedWtPath() };
  }
  return { written: false, reason: 'Windows Terminal settings.json not found', mirror: appliedWtPath() };
}

/** Launch Windows Terminal with a given profile name. */
export async function launchWindowsTerminal(profileName) {
  const { spawn } = await import('node:child_process');
  const args = profileName ? ['-p', profileName] : [];
  try {
    const child = spawn('wt', args, { detached: true, stdio: 'ignore', shell: process.platform === 'win32' });
    child.on('error', () => {/* reported via mirror path anyway */});
    child.unref();
    return { ok: true, command: `wt ${args.join(' ')}`.trim() };
  } catch (e) {
    return { ok: false, error: e.message, command: `wt ${args.join(' ')}`.trim() };
  }
}
