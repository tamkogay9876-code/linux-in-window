// @liw/core storage layout
// Everything lives under %LOCALAPPDATA%\linux (~/AppData/Local/linux).
// For dev / non-Windows environments the root can be overridden with LIW_HOME.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const DIR_LAYOUT = [
  'packages',
  'cache',
  'downloads',
  'temp',
  'runtime',
  'themes',
  'fonts',
  'configs',
  'scripts',
  'logs',
  'backups',
  'registry',
  'settings',
];

export function linuxHome() {
  if (process.env.LIW_HOME) return path.resolve(process.env.LIW_HOME);
  const localAppData =
    process.env.LOCALAPPDATA ||
    (process.platform === 'win32'
      ? path.join(os.homedir(), 'AppData', 'Local')
      : path.join(os.homedir(), '.local', 'share'));
  return path.join(localAppData, 'linux');
}

export function ensureLayout(home = linuxHome()) {
  for (const d of DIR_LAYOUT) fs.mkdirSync(path.join(home, d), { recursive: true });
  return home;
}

export function p(...parts) {
  return path.join(linuxHome(), ...parts);
}

export const paths = {
  get home() { return linuxHome(); },
  packages: (...r) => path.join(linuxHome(), 'packages', ...r),
  cache: (...r) => path.join(linuxHome(), 'cache', ...r),
  downloads: (...r) => path.join(linuxHome(), 'downloads', ...r),
  temp: (...r) => path.join(linuxHome(), 'temp', ...r),
  runtime: (...r) => path.join(linuxHome(), 'runtime', ...r),
  themes: (...r) => path.join(linuxHome(), 'themes', ...r),
  fonts: (...r) => path.join(linuxHome(), 'fonts', ...r),
  configs: (...r) => path.join(linuxHome(), 'configs', ...r),
  scripts: (...r) => path.join(linuxHome(), 'scripts', ...r),
  logs: (...r) => path.join(linuxHome(), 'logs', ...r),
  backups: (...r) => path.join(linuxHome(), 'backups', ...r),
  registry: (...r) => path.join(linuxHome(), 'registry', ...r),
  settings: (...r) => path.join(linuxHome(), 'settings', ...r),
};

export function readJsonSafe(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function timestampId(prefix = 'backup') {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

export function dirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const s = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(s) : fs.statSync(s).size;
  }
  return total;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
