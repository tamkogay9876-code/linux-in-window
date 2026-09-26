// Registry client. Works with:
//  - a real HTTP registry (settings.registryUrl) when reachable, or
//  - a local file:// registry directory (LIW_REGISTRY_DIR / bundled demo registry).
// In offline mode only cached archives + local installs are usable.

import fs from 'node:fs';
import path from 'node:path';
import { paths, readJsonSafe, writeJson } from './storage.js';
import crypto from 'node:crypto';

export function bundledRegistryDir() {
  // demo-packages ships at the repo root: <root>/demo-packages
  const here = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.resolve(here, '../../../demo-packages'),        // packages/core/src -> repo root
    path.resolve(here, '../../../../demo-packages'),     // when run from dist build
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.json'))) return c;
  }
  return null;
}

export function registryDir() {
  if (process.env.LIW_REGISTRY_DIR) return process.env.LIW_REGISTRY_DIR;
  const dir = paths.registry();
  if (fs.existsSync(path.join(dir, 'index.json'))) return dir;
  return bundledRegistryDir() || dir;
}

export function localRegistryIndex() {
  const idx = readJsonSafe(path.join(registryDir(), 'index.json'), null);
  return idx ? idx.packages || [] : [];
}

export async function registrySearch(query) {
  const q = String(query || '').toLowerCase();
  const all = localRegistryIndex();
  if (!q) return all;
  return all.filter(
    (p) =>
      p.id.includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (p.category || '').toLowerCase().includes(q)
  );
}

export async function registryInfo(id) {
  return localRegistryIndex().find((p) => p.id === id) || null;
}

export function registryDownloadUrl(info) {
  if (info.url) return info.url;
  return path.join(registryDir(), 'files', `${info.id}-${info.version}.linuxmod`);
}

/**
 * Download (http) or copy (local path) into cache. Returns {file, sha256, cached}.
 */
export async function fetchToCache(urlOrPath, expectedSha, onProgress = () => {}) {
  fs.mkdirSync(paths.cache(), { recursive: true });
  const name = path.basename(urlOrPath.replace(/[?#].*$/, ''));
  const dest = paths.cache(name);
  if (fs.existsSync(dest)) {
    const sha = sha256File(dest);
    if (!expectedSha || sha === expectedSha) {
      onProgress(100);
      return { file: dest, sha256: sha, cached: true };
    }
    fs.rmSync(dest); // corrupt cache entry — redownload
  }
  let sha;
  if (/^https?:\/\//.test(urlOrPath)) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status} for ${urlOrPath}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    sha = crypto.createHash('sha256').update(buf).digest('hex');
    onProgress(100);
  } else {
    const src = path.resolve(urlOrPath);
    if (!fs.existsSync(src)) throw new Error(`registry file not found: ${src}`);
    fs.copyFileSync(src, dest);
    sha = sha256File(dest);
    onProgress(100);
  }
  writeJson(`${dest}.meta.json`, { url: urlOrPath, sha256: sha, cachedAt: new Date().toISOString() });
  return { file: dest, sha256: sha, cached: false };
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Publish a built .linuxmod into the local registry (community store simulation). */
export function publishToLocalRegistry(archiveFile, manifest, { status = 'pending-review' } = {}) {
  const filesDir = path.join(registryDir(), 'files');
  fs.mkdirSync(filesDir, { recursive: true });
  const dest = path.join(filesDir, path.basename(archiveFile));
  fs.copyFileSync(archiveFile, dest);
  const sha = sha256File(dest);
  const idxFile = path.join(registryDir(), 'index.json');
  const idx = readJsonSafe(idxFile, { packages: [] });
  const entry = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description || '',
    author: manifest.author || 'unknown',
    type: manifest.type || 'theme',
    category: manifest.type || 'theme',
    tags: manifest.tags || [manifest.type || 'theme'],
    dependencies: (manifest.dependencies || []).map((d) => (typeof d === 'string' ? d : d.id)),
    permissions: manifest.permissions || [],
    size: fs.statSync(dest).size,
    sha256: sha,
    downloads: 0,
    rating: null,
    status,
    updatedAt: new Date().toISOString(),
    file: path.basename(dest),
  };
  idx.packages = idx.packages.filter((p) => p.id !== entry.id);
  idx.packages.push(entry);
  writeJson(idxFile, idx);
  return entry;
}
