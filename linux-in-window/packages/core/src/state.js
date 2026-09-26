// Settings + state store (installed package states, enabled list, profiles).

import fs from 'node:fs';
import path from 'node:path';
import { paths, readJsonSafe, writeJson, ensureLayout } from './storage.js';

const DEFAULT_SETTINGS = {
  themeMode: 'dark',            // dark | light | system
  safeMode: false,
  offline: false,
  autoUpdate: false,
  performance: { fps: 60, quality3d: 'medium', animations: true, reduceMotion: false },
  activeProfile: 'default',
  registryUrl: 'https://registry.linuxinwindow.local/v1',
  confirmBreakingUpdates: true,
};

export function loadSettings() {
  ensureLayout();
  const cur = readJsonSafe(paths.settings('settings.json'), null);
  const merged = { ...DEFAULT_SETTINGS, ...(cur || {}) };
  if (!cur) writeJson(paths.settings('settings.json'), merged);
  return merged;
}

export function saveSettings(s) {
  ensureLayout();
  writeJson(paths.settings('settings.json'), s);
  return s;
}

export function setSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  return saveSettings(s);
}

// ---- installed state DB -----------------------------------------------------
// packages/state.json  ->  { "<id>": { version, status, installedAt, updatedAt, source } }
// status: installed | running | stopped | disabled | broken | outdated | blocked

function stateFile() { return paths.settings('state.json'); }

export function loadState() {
  ensureLayout();
  return readJsonSafe(stateFile(), {});
}

export function saveState(state) {
  writeJson(stateFile(), state);
  return state;
}

export function getPackageState(id) {
  return loadState()[id] || null;
}

export function setPackageState(id, patch) {
  const state = loadState();
  state[id] = { ...(state[id] || { status: 'installed' }), ...patch, updatedAt: new Date().toISOString() };
  saveState(state);
  return state[id];
}

export function removePackageState(id) {
  const state = loadState();
  delete state[id];
  saveState(state);
}

// ---- profiles ---------------------------------------------------------------
// settings/profiles.json -> { "default": { packages: [ids], description } , ... }

function profilesFile() { return paths.settings('profiles.json'); }

export function loadProfiles() {
  ensureLayout();
  let p = readJsonSafe(profilesFile(), null);
  if (!p) {
    p = { default: { description: 'Default profile', packages: [] } };
    writeJson(profilesFile(), p);
  }
  return p;
}

export function saveProfiles(profiles) {
  writeJson(profilesFile(), profiles);
  return profiles;
}

export function createProfile(name, opts = {}) {
  const profiles = loadProfiles();
  if (profiles[name]) throw new Error(`profile "${name}" already exists`);
  profiles[name] = { description: opts.description || '', packages: opts.packages || [] };
  saveProfiles(profiles);
  return profiles[name];
}

export function deleteProfile(name) {
  if (name === 'default') throw new Error('cannot delete the default profile');
  const profiles = loadProfiles();
  if (!profiles[name]) throw new Error(`no such profile: ${name}`);
  delete profiles[name];
  saveProfiles(profiles);
}

export function profileAdd(profileName, packageId) {
  const profiles = loadProfiles();
  const prof = profiles[profileName];
  if (!prof) throw new Error(`no such profile: ${profileName}`);
  if (!prof.packages.includes(packageId)) prof.packages.push(packageId);
  saveProfiles(profiles);
}

export function profileRemove(profileName, packageId) {
  const profiles = loadProfiles();
  const prof = profiles[profileName];
  if (!prof) throw new Error(`no such profile: ${profileName}`);
  prof.packages = prof.packages.filter((p) => p !== packageId);
  saveProfiles(profiles);
}

export function useProfile(name) {
  const profiles = loadProfiles();
  if (!profiles[name]) throw new Error(`no such profile: ${name}`);
  setSetting('activeProfile', name);
  return name;
}

export function activeProfile() {
  const s = loadSettings();
  const profiles = loadProfiles();
  return profiles[s.activeProfile] ? s.activeProfile : 'default';
}

// ---- favorites / collections -------------------------------------------------

function favFile() { return paths.settings('collections.json'); }

export function loadCollections() {
  return readJsonSafe(favFile(), { favorites: [], collections: {} });
}

export function toggleFavorite(id) {
  const c = loadCollections();
  c.favorites = c.favorites.includes(id) ? c.favorites.filter((x) => x !== id) : [...c.favorites, id];
  writeJson(favFile(), c);
  return c;
}

export function collectionAdd(name, id) {
  const c = loadCollections();
  c.collections[name] = c.collections[name] || [];
  if (!c.collections[name].includes(id)) c.collections[name].push(id);
  writeJson(favFile(), c);
  return c;
}

// ---- logging ------------------------------------------------------------------

export function logPath(packageId) {
  return paths.logs(`${packageId}.log`);
}

export function appendLog(packageId, level, message) {
  const file = logPath(packageId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}\n`;
  fs.appendFileSync(file, line, 'utf8');
}

export function readLog(packageId, tailLines = 50) {
  const file = logPath(packageId);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8').split('\n').slice(-tailLines).join('\n');
}
