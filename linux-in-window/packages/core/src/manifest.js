// Package manifest (package.json inside a .linuxmod / package folder) validation.

export const PACKAGE_TYPES = [
  'theme', 'prompt', 'font', 'background', 'animation', 'sound',
  '3d', 'shell', 'widget', 'icon', 'developer', 'gaming', 'ai', 'mega-pack',
];

export const KNOWN_PERMISSIONS = [
  'terminal',            // modify terminal behavior/appearance
  'filesystem:user',     // read/write inside user folders
  'windows-terminal',    // write Windows Terminal settings.json
  'network',             // allow runtime network access
  'python',              // execute python scripts at install/run time
  'nox',                 // run nox scripts
  'gpu',                 // use WebGL/3D rendering
  'audio',               // play sounds
  'fonts:install',       // install fonts to the system (explicit user consent)
  'env',                 // set environment variables / aliases
];

// Permissions considered "elevated" -> UI must warn the user.
export const ELEVATED_PERMISSIONS = ['network', 'python', 'fonts:install', 'env'];

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/**
 * Validate a parsed manifest object.
 * @returns {{ok:boolean, errors:string[], warnings:string[], value?:object}}
 */
export function validateManifest(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['manifest is not an object'], warnings };
  }
  const m = raw;

  if (typeof m.id !== 'string' || !ID_RE.test(m.id)) {
    errors.push('id is required and must match ^[a-z0-9][a-z0-9._-]*$');
  }
  if (typeof m.name !== 'string' || !m.name.trim()) errors.push('name is required');
  if (typeof m.version !== 'string' || !SEMVER_RE.test(m.version)) {
    errors.push('version must be semver (x.y.z)');
  }
  if (typeof m.description !== 'string') warnings.push('missing description');
  if (m.type !== undefined && !PACKAGE_TYPES.includes(m.type)) {
    warnings.push(`unknown type "${m.type}"`);
  }

  if (m.runtime !== undefined) {
    if (typeof m.runtime !== 'object') errors.push('runtime must be an object');
    else {
      for (const k of Object.keys(m.runtime)) {
        if (!['python', 'nox', 'webgl'].includes(k)) warnings.push(`unknown runtime "${k}"`);
      }
    }
  }

  // permissions may be array or object map
  const perms = normalizePermissions(m.permissions);
  for (const p of perms.unknown) warnings.push(`unknown permission "${p}"`);

  if (m.targets !== undefined && !Array.isArray(m.targets)) errors.push('targets must be an array');
  if (m.dependencies !== undefined) {
    if (!Array.isArray(m.dependencies)) errors.push('dependencies must be an array');
    else for (const d of m.dependencies) {
      if (typeof d === 'string') continue;
      if (!d || typeof d.id !== 'string') { errors.push('dependency entries need an id'); continue; }
      if (d.version !== undefined && !SEMVER_RE.test(String(d.version))) {
        warnings.push(`dependency ${d.id}: version should be semver`);
      }
    }
  }
  if (m.entry !== undefined && typeof m.entry !== 'string') errors.push('entry must be a string');
  if (m.performance !== undefined && typeof m.performance !== 'object') {
    errors.push('performance must be an object');
  }
  if (m.assets !== undefined && typeof m.assets !== 'object') errors.push('assets must be an object');

  return { ok: errors.length === 0, errors, warnings, value: m };
}

export function normalizePermissions(permissions) {
  const known = [];
  const unknown = [];
  const flags = {};
  const push = (name, allowed = true) => {
    if (!KNOWN_PERMISSIONS.includes(name)) unknown.push(name);
    else if (allowed) known.push(name);
    flags[name] = allowed;
  };
  if (Array.isArray(permissions)) {
    for (const p of permissions) if (typeof p === 'string') push(p, true);
  } else if (permissions && typeof permissions === 'object') {
    for (const [k, v] of Object.entries(permissions)) {
      if (v === false) push(k, false);
      else push(k, v !== 'none');
    }
  }
  return { list: known, unknown, flags };
}

export function grantedPermissions(manifest) {
  return normalizePermissions(manifest.permissions).list;
}

export function elevatedPermissionsRequested(manifest) {
  return grantedPermissions(manifest).filter((p) => ELEVATED_PERMISSIONS.includes(p));
}

export function dependencyIds(manifest) {
  return (manifest.dependencies || []).map((d) => (typeof d === 'string' ? d : d.id));
}

/** Read + validate a package folder's package.json. */
import fs from 'node:fs';
import path from 'node:path';

export function loadPackageManifest(dir) {
  const file = path.join(dir, 'package.json');
  if (!fs.existsSync(file)) throw new Error(`no package.json in ${dir}`);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`invalid package.json in ${dir}: ${e.message}`);
  }
  const result = validateManifest(raw);
  if (!result.ok) {
    throw new Error(`invalid manifest ${raw?.id || dir}:\n - ${result.errors.join('\n - ')}`);
  }
  return raw;
}
