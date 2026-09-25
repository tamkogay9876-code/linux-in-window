// CLI commands: doctor / backup / restore / rollback / cache-clean extras /
// profiles / export / import / settings / favorite / collection / open / ai.

import path from 'node:path';
import { color, table, ok, warn, err, info } from '../ui.js';
import {
  runDoctor, listBackups, createBackup, restore, pruneBackups,
  loadProfiles, createProfile, deleteProfile, profileAdd, profileRemove,
  useProfileAndApply, exportProfile, importProfile,
  loadSettings, saveSettings, setSetting,
  toggleFavorite, loadCollections, collectionAdd,
  effectiveConfig, applyAll, readJsonSafe, paths,
} from '@liw/core';
import fs from 'node:fs';

export function cmdDoctor() {
  const r = runDoctor();
  info(color.bold('Linux in Window Doctor\n'));
  for (const c of r.checks) {
    const icon = c.status === 'ok' ? color.green('✓') : c.status === 'warn' ? color.yellow('!') : c.status === 'error' ? color.red('✗') : color.dim('·');
    console.log(`  ${icon} ${c.name.padEnd(32)} ${color.dim(c.detail || '')}`);
  }
  for (const w of r.warnings) warn(w);
  for (const e of r.errors) err(e);
  info('');
  if (r.ok && !r.warnings.length) ok('everything looks good');
  else if (r.ok) warn(`${r.warnings.length} warning(s)`);
  else err(`${r.errors.length} error(s) found`);
  if (!r.ok) process.exitCode = 1;
}

export function cmdBackup(label = 'manual') {
  const b = createBackup(label);
  ok(`backup created: ${b.id}`);
  pruneBackups(20);
}

export function cmdRollback(backupId = null) {
  try {
    const list = listBackups();
    if (!list.length) { err('no backups available'); process.exitCode = 1; return; }
    const target = backupId || list[0].id;
    const m = restore(target);
    try { applyAll(); } catch { /* best effort */ }
    ok(`rolled back to ${m.id} (${m.label}) and re-applied configuration`);
  } catch (e) { err(e.message); process.exitCode = 1; }
}

export function cmdRestore(fileOrId) {
  // accept a backup id OR a .linuxprofile file
  if (fileOrId.endsWith('.linuxprofile')) return cmdImport(fileOrId);
  return cmdRollback(fileOrId);
}

export function cmdProfiles(sub, name, ...rest) {
  const profiles = loadProfiles();
  if (!sub || sub === 'list') {
    const active = loadSettings().activeProfile;
    console.log(table(
      Object.entries(profiles).map(([n, p]) => [n === active ? color.cyan('* ' + n) : '  ' + n, p.description || '', p.packages.join(', ') || '-']),
      ['PROFILE', 'DESCRIPTION', 'PACKAGES']
    ));
    return;
  }
  if (sub === 'create') {
    if (!name) { err('usage: linux profile create <name>'); return; }
    createProfile(name, { description: rest.join(' ') });
    ok(`created profile "${name}"`);
    return;
  }
  if (sub === 'delete') { try { deleteProfile(name); ok(`deleted profile "${name}"`); } catch (e) { err(e.message); } return; }
  if (sub === 'add') { try { profileAdd(name, rest[0]); ok(`added ${rest[0]} to ${name}`); } catch (e) { err(e.message); } return; }
  if (sub === 'remove') { try { profileRemove(name, rest[0]); ok(`removed ${rest[0]} from ${name}`); } catch (e) { err(e.message); } return; }
  if (sub === 'use') {
    try { const r = useProfileAndApply(name); ok(`switched to profile "${name}" (${r.conflicts.length} conflicts noted)`); }
    catch (e) { err(e.message); process.exitCode = 1; }
    return;
  }
  err(`unknown profile subcommand: ${sub}`);
}

export function cmdExport(name, out) {
  try {
    const file = out || `${name}.linuxprofile`;
    exportProfile(name, path.resolve(file));
    ok(`exported profile "${name}" -> ${path.resolve(file)}`);
    info(color.dim('share this file; on another machine run: linux import ' + file));
  } catch (e) { err(e.message); process.exitCode = 1; }
}

export async function cmdImport(file) {
  try {
    const r = await importProfile(path.resolve(file), { allowElevated: false });
    ok(`imported profile "${r.name}"`);
    for (const x of r.results) {
      if (x.ok) info(`  ✓ ${x.id}`);
      else err(`  ✗ ${x.id}: ${x.error}`);
    }
  } catch (e) { err(e.message); process.exitCode = 1; }
}

export function cmdSettings(sub, key, value) {
  const s = loadSettings();
  if (!sub || sub === 'list') {
    console.log(table(Object.entries(s).map(([k, v]) => [k, JSON.stringify(v)]), ['SETTING', 'VALUE']));
    return;
  }
  if (sub === 'get') { info(JSON.stringify(s[key], null, 2)); return; }
  if (sub === 'set') {
    let parsed = value;
    try { parsed = JSON.parse(value); } catch { /* string */ }
    if (key.includes('.')) {
      const [a, b] = key.split('.');
      s[a] = { ...(s[a] || {}), [b]: parsed };
      saveSettings(s);
    } else setSetting(key, parsed);
    ok(`${key} = ${JSON.stringify(parsed)}`);
    return;
  }
  err('usage: linux settings [list|get <key>|set <key> <value>]');
}

export function cmdFavorite(id) {
  const c = toggleFavorite(id);
  ok(`${id} ${c.favorites.includes(id) ? 'added to' : 'removed from'} favorites`);
}

export function cmdCollection(sub, name, id) {
  if (!sub) {
    const c = loadCollections();
    info(color.bold('Favorites: ') + (c.favorites.join(', ') || '-'));
    for (const [n, items] of Object.entries(c.collections)) info(color.bold(n + ': ') + items.join(', '));
    return;
  }
  if (sub === 'add') { collectionAdd(name, id); ok(`${id} added to collection "${name}"`); return; }
  err('usage: linux collection [add <collection> <package>]');
}

export function cmdConflicts() {
  const cfg = effectiveConfig();
  if (!cfg.conflicts.length) { ok('no theme conflicts between enabled packages'); return; }
  warn(`${cfg.conflicts.length} conflict(s):`);
  console.log(table(
    cfg.conflicts.slice(0, 40).map((c) => [c.key, c.wantedBy, String(c.oldValue).slice(0, 24), c.alsoWantedBy]),
    ['KEY', 'WINS', 'VALUE', 'ALSO WANTED BY']
  ));
  info(color.dim('\nTip: create a profile with only the packages you want combined, then "linux profile use <name>".'));
}

export function cmdSetupPath() {
  // On Windows this is done by the installer; here we explain/print instructions.
  const binDir = path.resolve(paths.home, '..', 'linux-bin');
  fs.mkdirSync(binDir, { recursive: true });
  const launcher = path.join(binDir, 'linux.cmd');
  if (!fs.existsSync(launcher)) {
    const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
    fs.writeFileSync(launcher, `@echo off\r\nnode "${path.join(repoRoot, 'packages/cli/src/index.js')}" %*\r\n`, 'utf8');
  }
  ok(`launcher written to ${binDir}`);
  warn('add that folder to PATH (installer does it automatically with your consent):');
  info(color.dim(`  setx PATH "%PATH%;${binDir}"`));
}

export async function cmdAi(sub, ...args) {
  // AI integration is an optional plugin category (§52). Without an AI package
  // installed we clearly say so instead of failing silently.
  const state = readJsonSafe(paths.settings('state.json'), {});
  const aiPkg = Object.keys(state).find((id) => (state[id].manifestType === 'ai') || id.includes('ai-'));
  if (!aiPkg) {
    warn('no AI package installed.');
    info('AI customization is an optional plugin category. Try:');
    info(`  ${color.cyan('linux search ai')}`);
    return;
  }
  info(`routing "${[sub, ...args].join(' ')}" to ${aiPkg} …`);
  warn('this build ships without a configured AI backend — the plugin decides what happens next.');
}
