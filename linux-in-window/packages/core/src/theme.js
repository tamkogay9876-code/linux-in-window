// Theme engine: loads each installed package's theme/theme.json (+ nox compile result),
// merges enabled packages into an "effective configuration", and detects conflicts.

import fs from 'node:fs';
import path from 'node:path';
import { paths, readJsonSafe } from './storage.js';
import { loadState, loadSettings, loadProfiles } from './state.js';
import { loadPackageManifest } from './manifest.js';

/** Read a package's theme contribution (theme/theme.json). */
export function readPackageTheme(pkgDir) {
  return readJsonSafe(path.join(pkgDir, 'theme', 'theme.json'), null);
}

/** Collect contributions from all enabled+installed packages, ordered by priority. */
export function collectContributions({ safeMode = false } = {}) {
  const state = loadState();
  const out = [];
  for (const [id, st] of Object.entries(state)) {
    if (st.status === 'disabled' || st.status === 'blocked' || st.status === 'broken') continue;
    const dir = paths.packages(id);
    if (!fs.existsSync(dir)) continue;
    let manifest;
    try { manifest = loadPackageManifest(dir); } catch { continue; }
    if (safeMode && (manifest.runtime?.python || manifest.runtime?.nox || manifest.runtime?.webgl)) {
      // safe mode keeps only basic JSON theme config
      const theme = readPackageTheme(dir);
      if (theme) out.push({ id, manifest, theme, safeOnly: true });
      continue;
    }
    const theme = readPackageTheme(dir);
    const noxFile = path.join(dir, 'nox', 'main.nox');
    out.push({
      id,
      manifest,
      theme,
      nox: fs.existsSync(noxFile) ? fs.readFileSync(noxFile, 'utf8') : null,
      dir,
    });
  }
  return out;
}

/**
 * Merge theme objects. Later packages override earlier ones key-by-key.
 * Produces a conflict list instead of silently overwriting.
 *
 * Priority order (highest wins): an enabled profile's package list is applied
 * last, so `profile.use` acts as the merge priority; otherwise alphabetical id.
 */
export function mergeThemes(contributions, { priority = null } = {}) {
  const ordered = [...contributions];
  if (Array.isArray(priority) && priority.length) {
    const rank = new Map(priority.map((id, i) => [id, i]));
    ordered.sort((a, b) => (rank.get(a.id) ?? -1) - (rank.get(b.id) ?? -1));
  }
  const merged = {
    scheme: {},        // WT colorScheme
    profile: {},       // WT profile overrides
    prompt: {},
    font: {},
    background: {},
    animation: [],
    sounds: [],
    nox: [],
    widgets: [],
  };
  const conflicts = [];
  const owners = new Map(); // dotted key -> package id

  const setPath = (obj, dotted, value, owner) => {
    const keys = dotted.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      cur[keys[i]] = cur[keys[i]] || {};
      cur = cur[keys[i]];
    }
    const last = keys[keys.length - 1];
    const fullKey = `${dotted}`;
    if (cur[last] !== undefined && cur[last] !== value && owners.has(fullKey) && owners.get(fullKey) !== owner) {
      conflicts.push({
        key: fullKey,
        wantedBy: owners.get(fullKey),
        oldValue: cur[last],
        alsoWantedBy: owner,
        newValue: value,
      });
    }
    cur[last] = value;
    owners.set(fullKey, owner);
  };

  for (const c of ordered) {
    const t = c.theme || {};
    for (const [section, values] of Object.entries(t)) {
      if (Array.isArray(values)) {
        merged[section] = merged[section] || [];
        merged[section].push(...values.map((v) => ({ ...v, source: c.id })));
      } else if (typeof values === 'object' && values !== null) {
        for (const [k, v] of Object.entries(values)) {
          setPath(merged, `${section}.${k}`, v, c.id);
        }
      }
    }
    if (c.nox) merged.nox.push({ id: c.id, source: c.nox });
  }
  return { merged, conflicts };
}

/** Build the Windows Terminal scheme + profile payload from a merged theme. */
export function buildWtContribution(id, merged) {
  const s = merged.scheme || {};
  const p = merged.profile || {};
  const scheme = s.name
    ? {
        name: s.name,
        foreground: s.foreground,
        background: s.background,
        cursorColor: s.cursorColor,
        ...(s.palette ? { ...s.palette } : {}),
      }
    : null;
  const profile = p.name
    ? {
        name: p.name,
        colorScheme: s.name || p.colorScheme,
        fontFace: merged.font?.face || p.fontFace,
        fontSize: merged.font?.size ?? p.fontSize,
        cursorShape: p.cursorShape,
        backgroundImage: merged.background?.image || p.backgroundImage,
        opacity: p.opacity,
        acrylic: p.acrylic,
        padding: p.padding,
        tabColor: p.tabColor,
        commandline: p.commandline,
        startingDirectory: p.startingDirectory,
      }
    : null;
  // prune undefined
  if (profile) for (const k of Object.keys(profile)) if (profile[k] === undefined) delete profile[k];
  return { id, scheme, profile };
}

export function effectiveConfig({ safeMode = false } = {}) {
  const contributions = collectContributions({ safeMode });
  let priority = null;
  try {
    // active profile (if not 'default') defines merge priority for its packages
    const s = loadSettings();
    const profiles = loadProfiles();
    if (s.activeProfile && s.activeProfile !== 'default' && profiles[s.activeProfile]) {
      priority = profiles[s.activeProfile].packages || [];
    }
  } catch { /* ignore */ }
  const { merged, conflicts } = mergeThemes(contributions, { priority });
  return { contributions, merged, conflicts };
}

export function writeEffectiveConfig(cfg) {
  fs.mkdirSync(paths.configs(), { recursive: true });
  fs.writeFileSync(paths.configs('applied.json'), JSON.stringify(cfg.merged, null, 2), 'utf8');
  return paths.configs('applied.json');
}
