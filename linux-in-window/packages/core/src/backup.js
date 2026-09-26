// Backup / rollback system.
// Before any operation that mutates Windows Terminal settings or package state,
// we snapshot into ~/AppData/Local/linux/backups/backup-YYYY-MM-DD-HHMMSS/.

import fs from 'node:fs';
import path from 'node:path';
import { paths, copyDir, readJsonSafe, writeJson, timestampId, removeDir } from './storage.js';
import { windowsTerminalSettingsPath } from './wt.js';

export function createBackup(label = 'manual') {
  const id = timestampId('backup');
  const dir = paths.backups(id);
  fs.mkdirSync(dir, { recursive: true });

  const manifest = { id, label, createdAt: new Date().toISOString(), items: [] };

  // 1. Windows Terminal settings.json
  const wtPath = windowsTerminalSettingsPath();
  if (wtPath && fs.existsSync(wtPath)) {
    fs.mkdirSync(path.join(dir, 'windows-terminal'), { recursive: true });
    fs.copyFileSync(wtPath, path.join(dir, 'windows-terminal', 'settings.json'));
    manifest.items.push('windows-terminal/settings.json');
  }

  // 2. Linux in Window settings + state + profiles
  for (const f of ['settings.json', 'state.json', 'profiles.json', 'collections.json']) {
    const src = paths.settings(f);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(dir, 'settings'), { recursive: true });
      fs.copyFileSync(src, path.join(dir, 'settings', f));
      manifest.items.push(`settings/${f}`);
    }
  }

  // 3. Applied effective config (merged theme output)
  const applied = paths.configs('applied.json');
  if (fs.existsSync(applied)) {
    fs.mkdirSync(path.join(dir, 'configs'), { recursive: true });
    fs.copyFileSync(applied, path.join(dir, 'configs', 'applied.json'));
    manifest.items.push('configs/applied.json');
  }

  writeJson(path.join(dir, 'backup.json'), manifest);
  return { id, dir, manifest };
}

export function listBackups() {
  const root = paths.backups();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .map((name) => readJsonSafe(path.join(root, name, 'backup.json'), null))
    .filter(Boolean)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Restore the most recent backup (or a specific one by id).
 * Restores WT settings and LIW state files. Package folders are not deleted.
 */
export function restore(backupId = null) {
  const root = paths.backups();
  let dir;
  if (backupId) {
    dir = path.join(root, backupId);
  } else {
    const list = listBackups();
    if (!list.length) throw new Error('no backups available');
    dir = path.join(root, list[0].id);
  }
  const manifest = readJsonSafe(path.join(dir, 'backup.json'), null);
  if (!manifest) throw new Error(`invalid backup: ${dir}`);

  const wtBackup = path.join(dir, 'windows-terminal', 'settings.json');
  if (fs.existsSync(wtBackup)) {
    const wtPath = windowsTerminalSettingsPath();
    if (wtPath) {
      fs.mkdirSync(path.dirname(wtPath), { recursive: true });
      fs.copyFileSync(wtBackup, wtPath);
    }
  }
  for (const sub of ['settings', 'configs']) {
    const src = path.join(dir, sub);
    if (fs.existsSync(src)) copyDir(src, paths[sub]());
  }
  return manifest;
}

export function pruneBackups(keep = 20) {
  const root = paths.backups();
  if (!fs.existsSync(root)) return 0;
  const names = fs
    .readdirSync(root)
    .filter((n) => n.startsWith('backup-'))
    .sort();
  let removed = 0;
  while (names.length > keep) {
    removeDir(path.join(root, names.shift()));
    removed++;
  }
  return removed;
}
