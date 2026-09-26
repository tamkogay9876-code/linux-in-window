// Builds the bundled demo marketplace registry:
//  - writes each demo package folder under <out>/packages-src/<id>/
//  - generates tiny placeholder assets (preview.png / icon.png / textures)
//  - packs every package into <out>/files/<id>-<version>.linuxmod
//  - writes <out>/index.json consumable by @liw/core's local registry client.
//
// Usage: node packages/demo-registry/src/index.js [outdir]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEMO_PACKAGES, REGISTRY_META } from './packages.js';

const here = path.dirname(fileURLToPath(import.meta.url));

function ziptool() {
  const candidates = [
    path.resolve(here, '../../../tools/ziptool.py'),
    path.resolve(here, '../../../../tools/ziptool.py'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('ziptool.py not found');
}

function pythonBin() {
  return process.env.LIW_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
}

// ---- minimal PNG writer (solid color) so declared assets exist on disk --------
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Solid-color RGB PNG with a slightly brighter border frame (looks like a swatch). */
export function solidPng(width, height, rgb, borderRgb = null) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const c = edge && borderRgb ? borderRgb : rgb;
      raw[o++] = c[0]; raw[o++] = c[1]; raw[o++] = c[2];
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function sha256File(f) {
  return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
}

export function buildDemoRegistry(outDir = path.join(os.homedir(), '.liw-demo-registry')) {
  fs.rmSync(outDir, { recursive: true, force: true });
  const srcRoot = path.join(outDir, 'packages-src');
  const filesRoot = path.join(outDir, 'files');
  fs.mkdirSync(srcRoot, { recursive: true });
  fs.mkdirSync(filesRoot, { recursive: true });

  const entries = [];
  for (const [id, files] of Object.entries(DEMO_PACKAGES)) {
    const pkgDir = path.join(srcRoot, id);
    const manifest = JSON.parse(files['package.json']);
    fs.mkdirSync(pkgDir, { recursive: true });
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(pkgDir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    }
    // generate placeholder binary assets referenced by the manifest/theme
    const theme = JSON.parse(files['theme/theme.json'] || '{}');
    const fg = hexToRgb(theme.scheme?.foreground || '#cccccc');
    const bg = hexToRgb(theme.scheme?.background || '#111111');
    const ensurePng = (rel, w = 320, h = 180) => {
      const full = path.join(pkgDir, rel);
      if (fs.existsSync(full)) return;
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, solidPng(w, h, bg, fg));
    };
    ensurePng('preview.png');
    ensurePng('assets/icon.png', 64, 64);
    ensurePng('assets/background.jpg'.replace('.jpg', '.png'));
    ensurePng('assets/textures/grass.png', 16, 16);
    ensurePng('assets/textures/dirt.png', 16, 16);
    // placeholder sound files (tiny valid-ish ogg header stubs are fine for metadata)
    for (const s of theme.sounds || []) {
      const full = path.join(pkgDir, s.file);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, Buffer.from('OggS\x00\x02stub', 'binary'));
      }
    }
    // pack .linuxmod
    const archive = path.join(filesRoot, `${id}-${manifest.version}.linuxmod`);
    execFileSync(pythonBin(), [ziptool(), 'create', archive, pkgDir]);
    const stat = fs.statSync(archive);
    const meta = REGISTRY_META[id] || {};
    entries.push({
      id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      author: manifest.author,
      type: manifest.type,
      category: meta.category || manifest.type || 'theme',
      tags: manifest.tags || [],
      dependencies: (manifest.dependencies || []).map((d) => (typeof d === 'string' ? d : d.id)),
      permissions: manifest.permissions || [],
      size: stat.size,
      sha256: sha256File(archive),
      downloads: meta.downloads || 0,
      rating: meta.rating ?? null,
      status: 'approved',
      compatibility: ['windows 10+', 'windows 11+'],
      includes: detectIncludes(manifest, files),
      updatedAt: '2026-09-01T00:00:00.000Z',
      file: path.basename(archive),
    });
  }
  fs.writeFileSync(
    path.join(outDir, 'index.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), packages: entries }, null, 2)
  );
  return { outDir, count: entries.length };
}

function detectIncludes(manifest, files) {
  const out = [];
  if (files['theme/theme.json']) out.push('Theme');
  if (JSON.parse(files['theme/theme.json'] || '{}').prompt) out.push('Prompt');
  if (manifest.runtime?.nox && Object.keys(files).some((f) => f.endsWith('.nox'))) out.push('Animation');
  if (manifest.runtime?.webgl) out.push('3D');
  if (manifest.runtime?.python) out.push('Script');
  return out;
}

// CLI entry
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || path.join(os.homedir(), '.liw-demo-registry');
  const r = buildDemoRegistry(out);
  console.log(`demo registry built: ${r.outDir} (${r.count} packages)`);
}
