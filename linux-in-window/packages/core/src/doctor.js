// Doctor: environment health checks + package integrity verification.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { paths, readJsonSafe, dirSize } from './storage.js';
import { loadState, loadSettings, appendLog } from './state.js';
import { loadPackageManifest, validateManifest } from './manifest.js';
import { hashPackageDir } from './pkg-manager.js';
import { windowsTerminalSettingsPath, loadBaseWtSettings } from './wt.js';
import { localRegistryIndex } from './registry-client.js';

function check(cmd, args = ['--version']) {
  try {
    const out = execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 8000 }).toString().trim();
    return { ok: true, version: out.split('\n')[0] };
  } catch (e) {
    return { ok: false, error: e.code === 'ENOENT' ? 'not found in PATH' : e.message.split('\n')[0] };
  }
}

export function runDoctor() {
  const report = { ok: true, checks: [], warnings: [], errors: [] };
  const add = (name, status, detail) => report.checks.push({ name, status, detail });

  // CLI / install layout
  const home = paths.home;
  const missingDirs = [];
  for (const d of fs.existsSync(home) ? fs.readdirSync(home) : []) void d;
  const expected = ['packages', 'cache', 'downloads', 'temp', 'runtime', 'themes', 'fonts', 'configs', 'scripts', 'logs', 'backups', 'registry', 'settings'];
  if (!fs.existsSync(home)) missingDirs.push('(entire linux home)');
  else for (const d of expected) if (!fs.existsSync(path.join(home, d))) missingDirs.push(d);
  add('Linux in Window installation', missingDirs.length ? 'warn' : 'ok', `home=${home}${missingDirs.length ? ' missing: ' + missingDirs.join(', ') : ''}`);

  // PATH registration
  const onPath = (process.env.PATH || '').split(path.delimiter).some((p) => {
    try { return fs.existsSync(path.join(p, 'linux.cmd')) || fs.existsSync(path.join(p, 'linux')); } catch { return false; }
  });
  add('CLI PATH', onPath ? 'ok' : 'warn', onPath ? 'linux command is reachable' : 'run "linux setup-path" to add the CLI to PATH');

  // Windows Terminal
  const wtPath = windowsTerminalSettingsPath();
  add('Windows Terminal', wtPath ? 'ok' : (process.platform === 'win32' ? 'error' : 'warn'), wtPath || 'settings.json not found');
  if (wtPath) {
    try { JSON.parse(fs.readFileSync(wtPath, 'utf8')); add('Windows Terminal settings.json', 'ok', wtPath); }
    catch (e) { add('Windows Terminal settings.json', 'error', `invalid JSON: ${e.message}`); report.ok = false; }
  }

  // PowerShell / CMD
  if (process.platform === 'win32') {
    const ps = check('powershell', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()']);
    add('PowerShell', ps.ok ? 'ok' : 'warn', ps.version || ps.error);
  } else {
    add('PowerShell', 'skip', 'not on Windows');
  }

  // Python
  const py = check(process.env.LIW_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), ['--version']);
  add('Python', py.ok ? 'ok' : 'warn', py.version || py.error);

  // Node
  add('Node.js', process.versions.node ? 'ok' : 'error', `v${process.versions.node}`);

  // Registry
  const idx = localRegistryIndex();
  add('Package registry', idx.length ? 'ok' : 'warn', `${idx.length} packages indexed`);

  // Runtime dirs + nox runtime
  add('Runtime', fs.existsSync(paths.runtime()) ? 'ok' : 'warn', paths.runtime());
  try {
    const noxMod = await_import_nox();
    add('Nox runtime', noxMod ? 'ok' : 'warn', noxMod ? 'parser loaded' : '@liw/nox not resolvable');
  } catch {
    add('Nox runtime', 'warn', 'parser unavailable');
  }

  // Settings parse
  try { loadSettings(); add('Configuration', 'ok', paths.settings('settings.json')); }
  catch (e) { add('Configuration', 'error', e.message); report.ok = false; }

  // Broken packages + integrity
  const state = loadState();
  for (const [id, st] of Object.entries(state)) {
    const dir = paths.packages(id);
    if (!fs.existsSync(dir)) {
      report.errors.push(`package "${id}" is registered but missing from disk`);
      continue;
    }
    const mres = validateManifest(readJsonSafe(path.join(dir, 'package.json'), null));
    if (!mres.ok) { report.errors.push(`package "${id}" has an invalid manifest: ${mres.errors[0]}`); continue; }
    const meta = readJsonSafe(path.join(dir, '.liw-hash'), null);
    if (meta?.sha256) {
      const now = hashPackageDir(dir);
      if (now !== meta.sha256) report.warnings.push(`package "${id}" files changed since install (integrity mismatch)`);
    }
    if (mres.warnings.length) report.warnings.push(`package ${id}: ${mres.warnings[0]}`);
    // missing declared assets
    const assets = mres.value.assets || {};
    for (const a of Object.values(assets)) {
      if (typeof a === 'string' && !fs.existsSync(path.join(dir, a))) {
        report.errors.push(`${id} has missing asset "${a}"`);
      }
    }
  }

  // WT base settings readable
  try { loadBaseWtSettings(); } catch (e) { report.errors.push(`cannot read Windows Terminal settings: ${e.message}`); }

  report.errors.forEach(() => (report.ok = false));
  return report;
}

function await_import_nox() {
  try {
    // sync probe via require cache trick isn't available in ESM; do a path existence check instead
    const here = path.dirname(new URL(import.meta.url).pathname);
    return fs.existsSync(path.join(here, '../../nox/src/parser.js'));
  } catch {
    return false;
  }
}
