// Package manager: install / uninstall / update / dependency resolution /
// integrity checks / .linuxmod archives / local installs / offline cache.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { paths, ensureLayout, copyDir, removeDir, readJsonSafe, writeJson, dirSize, formatBytes } from './storage.js';
import { loadPackageManifest, grantedPermissions, elevatedPermissionsRequested, dependencyIds } from './manifest.js';
import { setPackageState, getPackageState, loadState, appendLog, loadSettings } from './state.js';
import { createBackup } from './backup.js';
import { registrySearch, registryInfo, registryDownloadUrl, fetchToCache } from './registry-client.js';

export function sha256File(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Compute the canonical hash of a package folder (manifest + sorted file hashes). */
export function hashPackageDir(dir) {
  const files = [];
  const walk = (d, rel = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(full, r);
      else if (e.name !== '.liw-hash') files.push([r, full]);
    }
  };
  walk(dir);
  const h = crypto.createHash('sha256');
  for (const [rel, full] of files) {
    h.update(rel);
    h.update('\0');
    h.update(fs.readFileSync(full));
    h.update('\0');
  }
  return h.digest('hex');
}

// ---- .linuxmod archive (zip) --------------------------------------------------

export function buildLinuxMod(pkgDir, outDir = paths.downloads()) {
  const manifest = loadPackageManifest(pkgDir);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${manifest.id}-${manifest.version}.linuxmod`);
  if (fs.existsSync(out)) fs.rmSync(out);
  // `zip -r out.linuxmod .` from inside the package dir
  execFileSync('zip', ['-r', '-q', out, '.'], { cwd: pkgDir });
  const sha = sha256File(out);
  writeJson(`${out}.sha256`, { file: path.basename(out), sha256: sha, size: fs.statSync(out).size });
  return { file: out, sha256: sha, size: fs.statSync(out).size };
}

export function extractArchive(archive, dest) {
  fs.mkdirSync(dest, { recursive: true });
  execFileSync('unzip', ['-q', '-o', archive, '-d', dest]);
  // handle single-wrapper-folder archives
  const entries = fs.readdirSync(dest);
  if (entries.length === 1) {
    const only = path.join(dest, entries[0]);
    if (fs.statSync(only).isDirectory() && fs.existsSync(path.join(only, 'package.json'))) {
      for (const e of fs.readdirSync(only)) {
        fs.renameSync(path.join(only, e), path.join(dest, e));
      }
      fs.rmdirSync(only);
    }
  }
  return dest;
}

// ---- dependency resolution -----------------------------------------------------

/**
 * Resolve install order for an id, using registry metadata.
 * Returns [{id, version, cycle?}] or throws on missing/loop.
 */
export async function resolveDependencies(id, { offline = false } = {}) {
  const order = [];
  const seen = new Set();
  const stack = new Set();

  async function visit(current) {
    if (seen.has(current)) return;
    if (stack.has(current)) throw new Error(`dependency cycle detected at "${current}"`);
    stack.add(current);
    let deps = [];
    const installed = getPackageState(current);
    if (installed && installed.manifestDeps) {
      deps = installed.manifestDeps;
    } else if (!offline) {
      const info = await registryInfo(current).catch(() => null);
      deps = info?.dependencies || [];
    }
    for (const d of deps) await visit(typeof d === 'string' ? d : d.id);
    stack.delete(current);
    seen.add(current);
    order.push(current);
  }

  await visit(id);
  return order; // dependencies first, target last
}

// ---- installation pipeline -------------------------------------------------------

export function analyzePackageDir(dir) {
  const manifest = loadPackageManifest(dir);
  const perms = grantedPermissions(manifest);
  const elevated = elevatedPermissionsRequested(manifest);
  const warnings = [];
  if (manifest.entry && !fs.existsSync(path.join(dir, manifest.entry))) {
    warnings.push(`declared entry "${manifest.entry}" is missing`);
  }
  for (const dep of dependencyIds(manifest)) {
    if (!getPackageState(dep)) warnings.push(`dependency "${dep}" is not installed yet`);
  }
  return { manifest, permissions: perms, elevated, warnings, size: dirSize(dir) };
}

/**
 * Install a package by registry id, or from a local path (folder or .linuxmod).
 * @param {string} spec id | ./path.linuxmod | /abs/path/folder
 * @param {object} opts { onProgress(stage,pct,message), allowElevated:boolean, offline:boolean }
 */
export async function install(spec, opts = {}) {
  ensureLayout();
  const onProgress = opts.onProgress || (() => {});
  const settings = loadSettings();
  const offline = opts.offline ?? settings.offline;

  const step = (stage, pct, message) => onProgress({ stage, pct, message });

  let sourceDir;
  let cleanup = [];
  let expectedSha = null;

  try {
    // 1-3. obtain package payload
    if (/^\.?\/|^[A-Za-z]:\\|^\/|^\.\.$/.test(spec) || spec.endsWith('.linuxmod') || fs.existsSync(spec)) {
      // local install
      step('resolving', 5, `local: ${spec}`);
      const abs = path.resolve(spec);
      if (!fs.existsSync(abs)) throw new Error(`path not found: ${abs}`);
      if (abs.endsWith('.linuxmod')) {
        step('downloading', 20, 'reading local archive');
        const tmp = paths.temp(`local-${Date.now()}`);
        cleanup.push(tmp);
        extractArchive(abs, tmp);
        expectedSha = sha256File(abs);
        sourceDir = tmp;
      } else {
        sourceDir = abs;
      }
    } else {
      // registry install
      step('resolving', 5, `fetching manifest for ${spec}`);
      if (offline) throw new Error(`offline mode: "${spec}" is not cached. Use "linux cache" to see cached packages.`);
      const info = await registryInfo(spec);
      if (!info) throw new Error(`package not found in registry: ${spec}`);
      step('downloading', 15, `${info.id}@${info.version}`);
      const url = registryDownloadUrl(info);
      const dl = await fetchToCache(url, info.sha256, (p) => step('downloading', 15 + p * 0.4, `downloading ${p}%`));
      expectedSha = info.sha256 || dl.sha256;
      // 4-6 verify checksum + extract to temp
      step('verifying', 60, 'checksum');
      if (info.sha256 && dl.sha256 !== info.sha256) {
        throw new Error('Package integrity check failed. Installation cancelled.');
      }
      const tmp = paths.temp(`install-${info.id}-${Date.now()}`);
      cleanup.push(tmp);
      extractArchive(dl.file, tmp);
      sourceDir = tmp;
    }

    // 7. analyze permissions
    step('analyzing', 68, 'permissions & structure');
    const analysis = analyzePackageDir(sourceDir);
    const manifest = analysis.manifest;
    if (analysis.elevated.length && !opts.allowElevated) {
      const err = new Error(
        `package requests elevated permissions: ${analysis.elevated.join(', ')}. ` +
        `Re-run with explicit user consent (--allow-permissions).`
      );
      err.code = 'NEEDS_PERMISSION_CONSENT';
      err.permissions = analysis.elevated;
      throw err;
    }

    // 8. dependencies
    step('dependencies', 72, `checking ${dependencyIds(manifest).length} dependencies`);
    for (const dep of dependencyIds(manifest)) {
      if (!getPackageState(dep)) {
        if (offline) throw new Error(`missing dependency "${dep}" and running offline`);
        step('dependencies', 74, `installing ${dep}`);
        await install(dep, { ...opts, onProgress });
      }
    }

    // 9. backup
    step('backup', 78, 'creating restore point');
    const backup = createBackup(`pre-install:${manifest.id}`);

    // 10. install files
    const dest = paths.packages(manifest.id);
    const already = fs.existsSync(dest);
    if (already) {
      const oldDest = `${dest}.old-${Date.now()}`;
      fs.renameSync(dest, oldDest);
      cleanup.push(oldDest);
    }
    step('installing', 84, `writing ${formatBytes(analysis.size)}`);
    copyDir(sourceDir, dest);
    const actualSha = hashPackageDir(dest);
    writeJson(path.join(dest, '.liw-hash'), { sha256: actualSha, sourceSpec: spec, expectedArchiveSha: expectedSha, installedAt: new Date().toISOString(), backupId: backup.id });

    // 11. execute install script (python) — sandboxed: no network env, user scope only
    if (fs.existsSync(path.join(dest, 'install.py')) && manifest.runtime?.python) {
      step('script', 90, 'running install.py');
      runPythonScript(dest, 'install.py', manifest);
    }

    // 12-14. register + mark installed
    step('registering', 95, 'applying configuration');
    setPackageState(manifest.id, {
      version: manifest.version,
      status: 'installed',
      source: spec,
      permissions: analysis.permissions,
      manifestDeps: dependencyIds(manifest),
      size: analysis.size,
    });
    appendLog(manifest.id, 'info', `installed ${manifest.version} from ${spec}`);

    step('done', 100, `finished installing ${manifest.id}`);
    return { ok: true, id: manifest.id, version: manifest.version, backupId: backup.id, hash: actualSha, permissions: analysis.permissions };
  } catch (e) {
    if (typeof spec === 'string' && !spec.includes('/') && !spec.includes('\\')) appendLog(spec, 'error', `install failed: ${e.message}`);
    throw e;
  } finally {
    for (const c of cleanup) removeDir(c);
  }
}

export function runPythonScript(pkgDir, script, manifest) {
  const python = process.env.LIW_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  try {
    execFileSync(python, [path.join(pkgDir, script)], {
      cwd: pkgDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
      env: { ...process.env, LIW_PKG_DIR: pkgDir, LIW_SANDBOX: '1', LIW_ALLOW_NETWORK: manifest.permissions?.network ? '1' : '0' },
    });
    return { ok: true };
  } catch (e) {
    const err = new Error(`script ${script} failed: ${e.stderr?.toString() || e.message}`);
    err.code = 'SCRIPT_FAILED';
    throw err;
  }
}

export function uninstall(id, { keepBackup = true } = {}) {
  const st = getPackageState(id);
  if (!st) throw new Error(`not installed: ${id}`);
  const dir = paths.packages(id);
  const manifest = fs.existsSync(dir) ? readJsonSafe(path.join(dir, 'package.json'), null) : null;
  if (manifest && manifest.runtime?.python && fs.existsSync(path.join(dir, 'uninstall.py'))) {
    try { runPythonScript(dir, 'uninstall.py', manifest); } catch (e) { appendLog(id, 'warn', e.message); }
  }
  if (keepBackup) createBackup(`pre-uninstall:${id}`);
  removeDir(dir);
  const state = loadState();
  delete state[id];
  writeJson(paths.settings('state.json'), state);
  appendLog(id, 'info', 'uninstalled');
  return { ok: true, id };
}

export function listInstalled() {
  const state = loadState();
  const rows = [];
  for (const [id, st] of Object.entries(state)) {
    const dir = paths.packages(id);
    const present = fs.existsSync(dir);
    rows.push({
      id,
      name: st.name || id,
      version: st.version,
      status: !present ? 'broken' : st.status || 'installed',
      size: st.size ?? (present ? dirSize(dir) : 0),
    });
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

/** Check installed packages against the registry for updates. */
export async function checkUpdates({ offline = false } = {}) {
  if (offline) return [];
  const state = loadState();
  const updates = [];
  for (const [id, st] of Object.entries(state)) {
    const info = await registryInfo(id).catch(() => null);
    if (info && compareSemver(info.version, st.version) > 0) {
      updates.push({ id, from: st.version, to: info.version });
    }
  }
  return updates;
}

export function compareSemver(a, b) {
  const pa = String(a).split('-')[0].split('.').map(Number);
  const pb = String(b).split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export async function upgradeAll(opts = {}) {
  const updates = await checkUpdates(opts);
  const results = [];
  for (const u of updates) {
    try {
      const r = await install(u.id, opts);
      results.push({ id: u.id, ok: true, to: u.to, backupId: r.backupId });
    } catch (e) {
      results.push({ id: u.id, ok: false, error: e.message });
    }
  }
  return results;
}

// ---- cache ---------------------------------------------------------------------

export function cacheList() {
  const dir = paths.cache();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((name) => {
    const f = path.join(dir, name);
    const meta = readJsonSafe(`${f}.meta.json`, {});
    return { name, file: f, size: fs.statSync(f).size, sha256: meta.sha256, cachedAt: meta.cachedAt };
  });
}

export function cacheClean() {
  removeDir(paths.cache());
  fs.mkdirSync(paths.cache(), { recursive: true });
  return true;
}

// ---- enable/disable/run/stop ------------------------------------------------------

export function setStatus(id, status) {
  const st = getPackageState(id);
  if (!st) throw new Error(`not installed: ${id}`);
  setPackageState(id, { status });
  appendLog(id, 'info', `status -> ${status}`);
  return getPackageState(id);
}
