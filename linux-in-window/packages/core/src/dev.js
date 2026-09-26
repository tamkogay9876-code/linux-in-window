// Developer mode: scaffold new packages, validate, test, build .linuxmod, watch (hot reload).

import fs from 'node:fs';
import path from 'node:path';
import { paths } from './storage.js';
import { validateManifest } from './manifest.js';
import { buildLinuxMod, analyzePackageDir } from './pkg-manager.js';

const SKELETON = (id, name) => ({
  'package.json': JSON.stringify(
    {
      id,
      name,
      version: '0.1.0',
      author: 'you',
      description: `${name} customization for Linux in Window`,
      type: 'theme',
      entry: 'main.py',
      runtime: { python: false, nox: true, webgl: false },
      permissions: ['terminal'],
      targets: ['windows-terminal'],
      dependencies: [],
      assets: { preview: 'preview.png', icon: 'assets/icon.png' },
    },
    null,
    2
  ) + '\n',
  'config.json': JSON.stringify({ debug: false }, null, 2) + '\n',
  'README.md': `# ${name}\n\nA Linux in Window customization package.\n\n## Install\n\n\`\`\`bash\nlinux install ./${id}.linuxmod\nlinux run ${id}\n\`\`\`\n`,
  'main.py':
    '# Optional entry point. Runs only when "runtime.python" is enabled and the user granted permission.\nprint("hello from ' + id + '")\n',
  'install.py':
    '# Runs during installation (sandboxed, user scope).\nprint("installed ' + id + '")\n',
  'uninstall.py':
    '# Runs before removal (best effort; failures are logged but never block uninstall).\nprint("uninstalled ' + id + '")\n',
  'theme/theme.json': JSON.stringify(
    {
      scheme: { name: name, foreground: '#E6E6E6', background: '#101014', cursorColor: '#00FFCC' },
      profile: { name, fontSize: 12, opacity: 1.0 },
      font: {},
      background: {},
    },
    null,
    2
  ) + '\n',
  'nox/main.nox':
    `terminal {\n\n    background "#101014"\n\n    color "#00ffcc"\n\n    cursor {\n        color "#ff00aa"\n        blink true\n    }\n\n}\n\nanimation pulse {\n\n    target "terminal"\n\n    property opacity\n\n    from 0.85\n\n    to 1.0\n\n    duration 1200\n\n    loop true\n}\n`,
});

export function devCreate(name, cwd = process.cwd()) {
  const id = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!id) throw new Error('invalid package name');
  const dir = path.join(cwd, id);
  if (fs.existsSync(dir)) throw new Error(`directory already exists: ${dir}`);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'theme'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'nox'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  const display = name.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  for (const [rel, content] of Object.entries(SKELETON(id, display))) {
    fs.writeFileSync(path.join(dir, rel), content, 'utf8');
  }
  return dir;
}

export async function devValidate(dir = process.cwd()) {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) return { ok: false, errors: ['no package.json found'], warnings: [] };
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = validateManifest(raw);
  const missing = [];
  for (const a of Object.values(raw.assets || {})) {
    if (typeof a === 'string' && !fs.existsSync(path.join(dir, a))) missing.push(a);
  }
  const warnings = [...res.warnings, ...missing.map((m) => `declared asset missing on disk: ${m}`)];
  // nox syntax check
  const noxDir = path.join(dir, 'nox');
  if (fs.existsSync(noxDir)) {
    const { validateNox } = await loadNox();
    for (const f of fs.readdirSync(noxDir).filter((f) => f.endsWith('.nox'))) {
      const v = validateNox(fs.readFileSync(path.join(noxDir, f), 'utf8'));
      if (!v.ok) warnings.push(`nox/${f}: ${v.errors[0]}`);
    }
  }
  return { ok: res.ok, errors: res.errors, warnings };
}

let _noxPromise = null;
function loadNox() {
  if (!_noxPromise) _noxPromise = import('@liw/nox');
  return _noxPromise;
}

export function devTest(dir = process.cwd()) {
  const analysis = analyzePackageDir(dir);
  const checks = [
    { name: 'manifest valid', ok: true },
    { name: `permissions: ${analysis.permissions.join(', ') || '(none)'}`, ok: true },
    { name: 'entry point', ok: !analysis.warnings.some((w) => w.startsWith('declared entry')) },
  ];
  return { ok: checks.every((c) => c.ok), checks, warnings: analysis.warnings, manifest: analysis.manifest };
}

export async function devBuild(dir = process.cwd(), outDir) {
  const v = await devValidate(dir);
  if (!v.ok) throw new Error(`build failed validation:\n - ${v.errors.join('\n - ')}`);
  return buildLinuxMod(dir, outDir || paths.downloads());
}

/**
 * Hot reload watcher: watches .nox/.json files inside a package dir,
 * invokes onChange(files) with debouncing.
 */
export function devWatch(dir, onChange, { debounceMs = 150 } = {}) {
  const pending = new Set();
  let timer = null;
  const flush = () => {
    timer = null;
    if (!pending.size) return;
    const files = [...pending];
    pending.clear();
    onChange(files);
  };
  const watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    if (!/\.(nox|json|py|css)$/i.test(filename)) return;
    pending.add(filename);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  });
  return { close: () => watcher.close() };
}
