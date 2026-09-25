#!/usr/bin/env node
// Linux in Window — command line interface.
//   linux <command> [options]
// Everything here is a thin wrapper over @liw/core so GUI/CLI never diverge.

import { color, ok, err, info } from './ui.js';
import * as pkg from './commands/pkg.js';
import * as sys from './commands/system.js';
import * as dev from './commands/dev.js';

const HELP = `${color.bold('Linux in Window')} ${color.dim('v0.1.0')} — customize Windows like Linux: themes, packages, marketplace.

${color.bold('Marketplace & packages')}
  ${color.cyan('linux search <query>')}          search the marketplace
  ${color.cyan('linux marketplace')}             open marketplace help
  ${color.cyan('linux install <package|file>')}  install (resolves dependencies, verifies sha256)
  ${color.cyan('linux uninstall <package>')}     remove a package (+ backup first)
  ${color.cyan('linux list')}                    installed packages + status
  ${color.cyan('linux info <package>')}          package details
  ${color.cyan('linux update')}                  check for updates
  ${color.cyan('linux upgrade')}                 install all updates (rollback-able)

${color.bold('Runtime')}
  ${color.cyan('linux run <package>')}           apply config + open Windows Terminal
  ${color.cyan('linux stop <package>')}
  ${color.cyan('linux restart <package>')}
  ${color.cyan('linux enable/disable <package>')}
  ${color.cyan('linux conflicts')}               show theme merge conflicts

${color.bold('Profiles & sharing')}
  ${color.cyan('linux profile list|create <n>|delete <n>|add <n> <pkg>|remove <n> <pkg>|use <n>')}
  ${color.cyan('linux export <profile> [file]')} write a .linuxprofile
  ${color.cyan('linux import <file>')}           restore a shared setup

${color.bold('System')}
  ${color.cyan('linux doctor')}                  environment + package health
  ${color.cyan('linux backup [label]')}          snapshot WT settings + state
  ${color.cyan('linux rollback [backup-id]')}    restore latest/specific backup
  ${color.cyan('linux cache [list|clean]')}      download cache
  ${color.cyan('linux logs <package>')}          per-package logs
  ${color.cyan('linux settings [list|get|set]')} configuration
  ${color.cyan('linux favorite <package>')}      toggle favorite
  ${color.cyan('linux setup-path')}              register CLI in PATH

${color.bold('Developer mode')}
  ${color.cyan('linux dev create <name>')}       scaffold a new package
  ${color.cyan('linux dev validate|test|build')} check / build .linuxmod
  ${color.cyan('linux dev publish')}             submit to registry (review queue)
  ${color.cyan('linux dev watch')}               hot reload .nox while editing
  ${color.cyan('linux nox <file.nox>')}          compile a nox file

${color.dim('"linux" is available in CMD, PowerShell and Windows Terminal after install.')}
`;

// parse argv
const [, , ...raw] = process.argv;
const flags = {};
const pos = [];
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  if (a === '--yes') flags.yes = true;
  else if (a.startsWith('--')) flags[a.slice(2)] = true;
  else if (a === '-h' || a === '--help') pos.unshift('help');
  else pos.push(a);
}
const [cmd, ...args] = pos;

switch (cmd) {
  case undefined:
  case 'help':      console.log(HELP); break;
  case 'version':
  case '--version': console.log('linux-in-window 0.1.0 (cli)'); break;
  case 'search':    await pkg.cmdSearch(args.join(' ') || ''); break;
  case 'marketplace': pkg.cmdMarketplace(); break;
  case 'install':   await pkg.cmdInstall(args[0], flags); break;
  case 'uninstall': await pkg.cmdUninstall(args[0]); break;
  case 'list':      pkg.cmdList(); break;
  case 'info':      await pkg.cmdInfo(args[0]); break;
  case 'run':       await pkg.cmdRun(args[0]); break;
  case 'stop':      pkg.cmdStop(args[0]); break;
  case 'restart':   await pkg.cmdRestart(args[0]); break;
  case 'enable':    pkg.cmdEnable(args[0]); break;
  case 'disable':   pkg.cmdDisable(args[0]); break;
  case 'update':    await pkg.cmdUpdate(); break;
  case 'upgrade':   await pkg.cmdUpgrade(); break;
  case 'conflicts': sys.cmdConflicts(); break;
  case 'doctor':    sys.cmdDoctor(); break;
  case 'backup':    sys.cmdBackup(args[0] || 'manual'); break;
  case 'rollback':  sys.cmdRollback(args[0] || null); break;
  case 'restore':   sys.cmdRestore(args[0]); break;
  case 'profile':   sys.cmdProfiles(args[0], args[1], ...args.slice(2)); break;
  case 'profiles':  sys.cmdProfiles('list'); break;
  case 'export':    sys.cmdExport(args[0], args[1]); break;
  case 'import':    await sys.cmdImport(args[0]); break;
  case 'settings':  sys.cmdSettings(args[0], args[1], args[2]); break;
  case 'favorite':  sys.cmdFavorite(args[0]); break;
  case 'collection': sys.cmdCollection(args[0], args[1], args[2]); break;
  case 'logs':      pkg.cmdLogs(args[0]); break;
  case 'cache':     pkg.cmdCache(args[0]); break;
  case 'clean':     pkg.cmdClean(); break;
  case 'setup-path': sys.cmdSetupPath(); break;
  case 'dev':       dev.cmdDev(args[0], ...args.slice(1)); break;
  case 'nox':       dev.cmdNox(args[0]); break;
  case 'ai':        await sys.cmdAi(args[0], ...args.slice(1)); break;
  default:
    err(`unknown command: ${cmd}`);
    info(`run ${color.cyan('linux help')} for usage`);
    process.exitCode = 1;
}
