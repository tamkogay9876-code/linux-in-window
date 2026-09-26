// CLI commands: search / install / uninstall / list / info / run / stop / restart /
// enable / disable / update / upgrade / marketplace / logs / cache / clean.

import { color, table, statusText, progressBar, ok, warn, err, info } from '../ui.js';
import { registrySearch, registryInfo } from '@liw/core';
import {
  install, uninstall, listInstalled, checkUpdates, upgradeAll,
  cacheList, cacheClean,
} from '@liw/core';
import { runPackage, stopPackage, restartPackage, enablePackage, disablePackage } from '@liw/core';
import { getPackageState, readLog, loadSettings, setSetting } from '@liw/core';
import { formatBytes } from '@liw/core';

export async function cmdSearch(query) {
  const results = await registrySearch(query);
  if (!results.length) { warn(`Found 0 packages for "${query}"`); return; }
  info(color.bold(`Found ${results.length} packages\n`));
  console.log(table(
    results.map((p) => [p.id, p.version, (p.category || p.type), String(p.downloads ?? 0), p.rating ?? '-']),
    ['ID', 'VERSION', 'CATEGORY', 'DOWNLOADS', 'RATING']
  ));
}

async function consentPrompt(analysis, yes) {
  if (!analysis.elevated.length) return true;
  info('');
  info(color.yellow('This package requests elevated permissions:'));
  for (const p of analysis.elevated) info(`  ${color.red('⚠')} ${p}`);
  info('');
  if (yes) { warn('--yes given: granting requested permissions'); return true; }
  // non-interactive default is deny; interactive TTY prompts y/N
  if (!process.stdin.isTTY) return false;
  const readline = (await import('node:readline/promises')).default;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Grant these permissions? [y/N] ')).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

export async function cmdInstall(spec, { yes = false } = {}) {
  const settings = loadSettings();
  let lastLine = '';
  const onProgress = ({ stage, pct, message }) => {
    const line = progressBar(stage, pct, message);
    if (process.stdout.isTTY) { process.stdout.write('\r\x1b[K' + line); lastLine = line; }
    else if (line !== lastLine) { console.log(line); lastLine = line; }
  };
  try {
    // pre-flight permission analysis for local installs & registry packages
    let allowElevated = yes;
    if (!allowElevated) {
      // ask before download using registry metadata when possible
      const info_ = spec.startsWith('.') || spec.includes('/') || spec.endsWith('.linuxmod') ? null : await registryInfo(spec).catch(() => null);
      const elev = (info_?.permissions || []).filter((p) => ['network', 'python', 'fonts:install', 'env'].includes(p));
      if (elev.length) {
        info(color.yellow(`\n"${spec}" wants elevated permissions: ${elev.join(', ')}`));
        if (!process.stdin.isTTY && !yes) { err('refusing without consent (use --yes to grant)'); process.exitCode = 1; return; }
        if (process.stdin.isTTY) {
          const readline = (await import('node:readline/promises')).default;
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const a = (await rl.question('Grant? [y/N] ')).trim().toLowerCase();
          rl.close();
          allowElevated = a === 'y' || a === 'yes';
          if (!allowElevated) { info('cancelled.'); return; }
        }
      }
    }
    const r = await install(spec, { onProgress, allowElevated, offline: settings.offline });
    if (process.stdout.isTTY) process.stdout.write('\n');
    ok(`installed ${r.id}@${r.version}  (backup: ${r.backupId})`);
    info(color.dim(`stored at ~/AppData/Local/linux/packages/${r.id}`));
  } catch (e) {
    if (process.stdout.isTTY) process.stdout.write('\n');
    if (e.code === 'NEEDS_PERMISSION_CONSENT') {
      err(`installation cancelled: ${e.permissions.join(', ')} require explicit consent (--yes)`);
    } else {
      err(e.message);
      if (/integrity/i.test(e.message)) err('Installation cancelled.');
    }
    process.exitCode = 1;
  }
}

export async function cmdUninstall(id) {
  try {
    const r = uninstall(id);
    ok(`uninstalled ${r.id} (a pre-uninstall backup was created)`);
  } catch (e) { err(e.message); process.exitCode = 1; }
}

export function cmdList() {
  const rows = listInstalled();
  if (!rows.length) { warn('no packages installed. Try: linux install cyberpunk-terminal'); return; }
  console.log(table(
    rows.map((r) => [r.id, r.version, statusText(r.status), formatBytes(r.size || 0)]),
    ['NAME', 'VERSION', 'STATUS', 'SIZE']
  ));
}

export async function cmdInfo(spec) {
  const local = getPackageState(spec);
  const remote = await registryInfo(spec).catch(() => null);
  const m = remote || (local && { id: spec, version: local.version });
  if (!remote && !local) { err(`unknown package: ${spec}`); process.exitCode = 1; return; }
  info(color.bold(`${remote?.name || spec}`.toUpperCase()));
  info('─'.repeat(48));
  info(remote?.description || '');
  info('');
  info(`Author:         ${remote?.author || '-'}`);
  info(`Version:        ${remote?.version || local?.version}`);
  info(`Size:           ${remote?.size ? formatBytes(remote.size) : (local?.size ? formatBytes(local.size) : '-')}`);
  info(`Category:       ${remote?.category || '-'}   Tags: ${(remote?.tags || []).join(', ') || '-'}`);
  info(`Downloads:      ${remote?.downloads ?? '-'}   Rating: ${remote?.rating ?? '-'}`);
  info(`Compatibility:  Windows 10+ / Windows 11+`);
  if (remote?.includes?.length) info(`Includes:       ${remote.includes.map((i) => '✓ ' + i).join('  ')}`);
  if (remote?.permissions?.length) info(`Permissions:    ${remote.permissions.join(', ')}`);
  if (remote?.dependencies?.length) info(`Dependencies:   ${remote.dependencies.join(', ')}`);
  if (local) info(`Local status:   ${statusText(local.status)}`);
}

export async function cmdRun(id) {
  try {
    const r = await runPackage(id);
    ok(`running ${id} — Windows Terminal profile "${r.profile}"`);
    if (!r.launch.ok) warn(`could not spawn "wt": ${r.launch.error || 'not found'} — configuration applied anyway`);
    else info(color.dim(`$ ${r.launch.command}`));
  } catch (e) { err(e.message); process.exitCode = 1; }
}

export function cmdStop(id)   { try { stopPackage(id); ok(`stopped ${id}`); } catch (e) { err(e.message); process.exitCode = 1; } }
export async function cmdRestart(id) { try { await restartPackage(id); ok(`restarted ${id}`); } catch (e) { err(e.message); process.exitCode = 1; } }
export function cmdEnable(id)  { try { enablePackage(id); ok(`enabled ${id} — configuration re-applied`); } catch (e) { err(e.message); process.exitCode = 1; } }
export function cmdDisable(id) { try { disablePackage(id); ok(`disabled ${id} — configuration re-applied`); } catch (e) { err(e.message); process.exitCode = 1; } }

export async function cmdUpdate() {
  const updates = await checkUpdates({ offline: loadSettings().offline });
  if (!updates.length) { ok('everything is up to date'); return; }
  info(color.bold(`${updates.length} updates available\n`));
  console.log(table(updates.map((u) => [u.id, `${u.from} → ${u.to}`]), ['PACKAGE', 'UPDATE']));
  info('\nrun ' + color.cyan('linux upgrade') + ' to install them all');
}

export async function cmdUpgrade() {
  const results = await upgradeAll({ allowElevated: true });
  for (const r of results) {
    if (r.ok) ok(`upgraded ${r.id} → ${r.to} (backup ${r.backupId})`);
    else err(`${r.id}: ${r.error}`);
  }
  if (!results.length) info('nothing to upgrade');
}

export function cmdMarketplace() {
  info('Linux in Window Marketplace');
  info('────────────────────────────');
  info(`registry index: ${color.cyan(loadSettings().registryUrl)}`);
  info('browse the GUI with the Linux in Window app, or:');
  info(`  ${color.cyan('linux search <query>')}`);
  info(`  ${color.cyan('linux info <package>')}`);
  info(`  ${color.cyan('linux install <package>')}`);
}

export function cmdLogs(id, { lines = 50 } = {}) {
  const text = readLog(id, lines);
  if (!text.trim()) { warn(`no log entries for ${id}`); return; }
  info(text);
}

export function cmdCache(sub) {
  if (sub === 'clean') { cacheClean(); ok('cache cleaned'); return; }
  const items = cacheList();
  if (!items.length) { info('cache is empty'); return; }
  console.log(table(items.map((i) => [i.name, formatBytes(i.size), i.sha256?.slice(0, 12) || '-']), ['FILE', 'SIZE', 'SHA256']));
}

export function cmdClean() {
  const removed = cacheClean();
  void removed;
  const { removeDir, paths } = globalThis.__liwfs || {};
  void removeDir; void paths;
  ok('cache cleaned (temp dirs are removed automatically after each operation)');
}
