// CLI commands: dev create / validate / test / build / publish / watch / nox run.

import path from 'node:path';
import { color, ok, warn, err, info } from '../ui.js';
import {
  devCreate, devValidate, devTest, devBuild, devWatch,
  publishToLocalRegistry, loadPackageManifest,
} from '@liw/core';
import { compileNox, validateNox } from '@liw/nox';
import fs from 'node:fs';

export function cmdDev(sub, ...args) {
  (async () => {
    try {
      if (sub === 'create') {
        const dir = devCreate(args[0] || 'my-package');
        ok(`created package skeleton at ${dir}`);
        info(color.dim('next: edit theme/theme.json + nox/main.nox, then "linux dev build"'));
        return;
      }
      if (sub === 'validate') {
        const r = await devValidate(process.cwd());
        for (const w of r.warnings) warn(w);
        if (!r.ok) { for (const e of r.errors) err(e); process.exitCode = 1; }
        else ok('package.json is valid');
        return;
      }
      if (sub === 'test') {
        const r = devTest(process.cwd());
        for (const c of r.checks) console.log(`  ${c.ok ? color.green('✓') : color.red('✗')} ${c.name}`);
        for (const w of r.warnings) warn(w);
        if (!r.ok) process.exitCode = 1; else ok('package tests passed');
        return;
      }
      if (sub === 'build') {
        const r = await devBuild(process.cwd(), args[0]);
        ok(`built ${path.basename(r.file)} (${r.size} bytes)`);
        info(color.dim(`sha256 ${r.sha256}`));
        return;
      }
      if (sub === 'publish') {
        // build then copy into the local registry index (community store simulation)
        const built = await devBuild(process.cwd());
        const manifest = loadPackageManifest(process.cwd());
        const entry = publishToLocalRegistry(built.file, manifest);
        ok(`published ${entry.id}@${entry.version} to local registry (status: ${entry.status})`);
        info(color.dim('community packages stay in review until an admin approves them'));
        return;
      }
      if (sub === 'watch') {
        const dir = process.cwd();
        info(`watching ${dir} for .nox/.json changes (ctrl-c to stop)…`);
        const w = devWatch(dir, async (files) => {
          const v = await devValidate(dir);
          if (!v.ok) { err(`validation failed: ${v.errors[0]}`); return; }
          for (const f of files.filter((f) => f.endsWith('.nox'))) {
            const src = fs.readFileSync(path.join(dir, f), 'utf8');
            const chk = validateNox(src);
            if (!chk.ok) { err(`${f}: ${chk.errors[0]}`); continue; }
            info(color.green(`✓ recompiled ${f}`));
          }
          try { const { applyAll } = await import('@liw/core'); applyAll(); info('configuration hot-reloaded'); } catch (e) { warn(e.message); }
        });
        process.on('SIGINT', () => { w.close(); process.exit(0); });
        return;
      }
      err(`unknown dev subcommand: ${sub}\nusage: linux dev <create|validate|test|build|publish|watch>`);
      process.exitCode = 1;
    } catch (e) {
      err(e.message);
      process.exitCode = 1;
    }
  })();
}

export function cmdNox(file) {
  // compile a .nox file and print the resulting call trace / json
  const src = fs.readFileSync(path.resolve(file || 'nox/main.nox'), 'utf8');
  const v = validateNox(src);
  if (!v.ok) { err(v.errors[0]); process.exitCode = 1; return; }
  const { calls } = compileNox(src);
  info(color.bold(`compiled ${file || 'nox/main.nox'} — ${calls.length} API calls\n`));
  for (const c of calls.slice(0, 40)) {
    info(`  ${color.cyan(c.path)}(${c.args.map((a) => JSON.stringify(a)).join(', ')})`);
  }
  ok('nox compiled successfully (sandbox-safe)');
}
