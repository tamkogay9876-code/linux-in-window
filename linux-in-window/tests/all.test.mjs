// Linux in Window — automated test suite (node:test, zero dependencies).
//
//   npm test            # or: node --test tests/
//
// Every test runs against an isolated LIW_HOME temp dir, so the real user
// store is never touched.

import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Isolate storage BEFORE importing core.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'liw-test-'));
process.env.LIW_HOME = path.join(TMP, 'linux');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const core = await import(path.join(root, 'packages/core/src/index.js'));
const nox = await import(path.join(root, 'packages/nox/src/index.js'));

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

// ---------------------------------------------------------------------------
// Nox tokenizer / parser
// ---------------------------------------------------------------------------
describe('nox parser', () => {
  test('tokenizes strings, numbers, idents', () => {
    const t = nox.tokenize('background "#050505" width 600 opacity 0.75');
    assert.equal(t[0].value, 'background');
    assert.equal(t[1].type, 'string');
    assert.equal(t[1].value, '#050505');
  });

  test('parses spec terminal block with nested cursor', () => {
    const ast = nox.parseNox(`terminal {\n  background "#050505"\n  color "#00ffcc"\n  cursor {\n    color "#ff00aa"\n    blink true\n  }\n}`);
    assert.equal(ast.length, 1);
    assert.equal(ast[0].name, 'terminal');
  });

  test('parses bareword properties (position center)', () => {
    const ast = nox.parseNox('panel {\n  position center\n  width 600\n  blur 20\n}');
    assert.ok(ast[0].body.length >= 3);
  });

  test('parses named animation block', () => {
    const ast = nox.parseNox('animation pulse {\n  target "terminal"\n  property opacity\n  from 0.7\n  to 1.0\n  duration 1200\n  loop true\n}');
    assert.ok(JSON.stringify(ast).includes('pulse'));
  });

  test('parses scene with dotted animate target and vector args', () => {
    const ast = nox.parseNox('scene {\n  cube {\n    position 0 0 -5\n    rotation 0 45 0\n    animate rotation.y {\n      from 0\n      to 360\n      duration 4\n      loop true\n    }\n  }\n}');
    assert.equal(ast[0].name, 'scene');
  });

  test('full combined program parses', () => {
    const src = [
      'terminal { background "#050509" color "#00ffcc" cursor { color "#ff00aa" blink true } }',
      'panel { position center width 600 height 300 blur 20 radius 20 }',
      'animation pulse { target "terminal" property opacity from 0.7 to 1.0 duration 1200 loop true }',
      'scene { cube { position 0 0 -5 color "#00ffff" animate rotation.y { from 0 to 360 duration 4 loop true } } }',
    ].join('\n');
    const ast = nox.parseNox(src);
    assert.equal(ast.length, 4);
  });

  test('rejects unterminated string', () => {
    assert.throws(() => nox.tokenize('background "#oops'));
  });

  test('validateNox reports unknown top-level blocks', () => {
    const v = nox.validateNox('haxxor { rm_rf "/" }');
    assert.equal(v.ok, false);
    assert.ok(v.errors.length > 0);
  });

  test('compileForBrowser produces renderable JSON', () => {
    const prog = nox.compileForBrowser('terminal {\n  background "#111111"\n  color "#22ee22"\n}\nanimation a {\n  target "terminal"\n  property opacity\n  from 0.5\n  to 1\n  duration 100\n  loop true\n}');
    assert.equal(prog.terminal.background, '#111111');
    assert.ok(prog.animations.a);
  });
});

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------
describe('manifest validator', () => {
  const good = {
    id: 'cyberpunk-terminal', name: 'Cyberpunk Terminal', version: '1.0.0',
    author: 'Community', description: 'x', type: 'theme',
    runtime: { python: true, nox: true }, permissions: ['terminal'], targets: ['cmd'],
  };
  test('accepts valid manifest', () => {
    assert.equal(core.validateManifest(good).ok, true);
  });
  test('rejects bad id / version', () => {
    const r = core.validateManifest({ ...good, id: 'BAD ID!', version: '1.0' });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /id/.test(e)));
    assert.ok(r.errors.some((e) => /version/.test(e)));
  });
  test('warns on unknown permission but stays ok', () => {
    const r = core.validateManifest({ ...good, permissions: ['terminal', 'read:souls'] });
    assert.equal(r.ok, true);
    assert.ok(r.warnings.length >= 1);
  });
});

// ---------------------------------------------------------------------------
// Semver + package manager
// ---------------------------------------------------------------------------
describe('package manager logic', () => {
  test('compareSemver orders versions', () => {
    assert.ok(core.compareSemver('1.0.1', '1.0.0') > 0);
    assert.ok(core.compareSemver('2.0.0', '10.0.0') < 0);
    assert.equal(core.compareSemver('1.2.3', '1.2.3'), 0);
  });

  test('sha256 of known content', async () => {
    const f = path.join(TMP, 'hash-me.txt');
    fs.writeFileSync(f, 'abc');
    assert.equal(await core.sha256File(f), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('install → list → uninstall roundtrip via local folder', async () => {
    const src = path.join(TMP, 'src-pkg');
    fs.mkdirSync(path.join(src, 'theme'), { recursive: true });
    fs.writeFileSync(path.join(src, 'package.json'), JSON.stringify({
      id: 'test-local-theme', name: 'Test Local', version: '1.0.0',
      description: 't', type: 'theme', permissions: ['terminal'],
    }));
    fs.writeFileSync(path.join(src, 'theme', 'theme.json'), JSON.stringify({
      scheme: { name: 'TestLocal', foreground: '#AAAAAA', background: '#010101', cursorColor: '#AAAAAA' },
      profile: { name: 'TestLocal' },
    }));

    const res = await core.install(src, { offline: true, allowElevated: false });
    assert.equal(res.id, 'test-local-theme');

    const installed = core.listInstalled();
    assert.ok(installed.find((p) => p.id === 'test-local-theme'), 'should appear in list');
    assert.ok(fs.existsSync(core.paths.packages('test-local-theme')));

    core.uninstall('test-local-theme');
    assert.ok(!core.listInstalled().find((p) => p.id === 'test-local-theme'));
  });

  test('failed install does not corrupt state', async () => {
    const before = JSON.stringify(core.listInstalled());
    await assert.rejects(() => core.install('this-package-does-not-exist-xyz', { offline: true }));
    assert.equal(JSON.stringify(core.listInstalled()), before);
  });
});

// ---------------------------------------------------------------------------
// Backup & rollback
// ---------------------------------------------------------------------------
describe('backup system', () => {
  test('createBackup + restore roundtrip', () => {
    core.ensureLayout();
    core.writeJson(core.paths.settings('settings.json'), { theme: 'before' });
    const b = core.createBackup('test');
    assert.ok(b && b.id);
    core.writeJson(core.paths.settings('settings.json'), { theme: 'after' });
    core.restore(b.id);
    const s = core.readJsonSafe(core.paths.settings('settings.json'), {});
    assert.equal(s.theme, 'before');
    assert.ok(core.listBackups().some((x) => (x.id || x) === b.id));
  });
});

// ---------------------------------------------------------------------------
// Registry (bundled demo marketplace)
// ---------------------------------------------------------------------------
describe('registry', () => {
  test('search finds cyberpunk packages', async () => {
    const hits = await core.registrySearch('cyberpunk');
    assert.ok(hits.length >= 1);
  });
  test('marketplace lists the five demo packages', () => {
    const all = core.localRegistryIndex();
    for (const id of ['minimal-terminal', 'cyberpunk-terminal', 'retro-dos', 'matrix-terminal', 'minecraft-terminal']) {
      assert.ok(all.find((p) => p.id === id), `demo package missing: ${id}`);
    }
  });
});

// ---------------------------------------------------------------------------
// CLI smoke tests
// ---------------------------------------------------------------------------
describe('cli', () => {
  const cli = path.join(root, 'packages/cli/src/index.js');
  function runCli(args) {
    return execFileSync(process.execPath, [cli, ...args], {
      env: { ...process.env, NO_COLOR: '1' }, encoding: 'utf8', timeout: 30000, cwd: root,
    });
  }

  test('linux version prints something', () => {
    const out = runCli(['version']);
    assert.match(out, /\d+\.\d+\.\d+|Linux in Window/i);
  });
  test('linux help lists commands', () => {
    const out = runCli(['help']);
    for (const c of ['install', 'uninstall', 'run', 'doctor', 'list']) {
      assert.ok(out.includes(c), `help missing command ${c}`);
    }
  });
  test('linux search returns results', () => {
    const out = runCli(['search', 'matrix']);
    assert.match(out, /matrix-terminal/);
  });
});
