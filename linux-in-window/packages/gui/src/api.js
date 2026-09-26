// Browser API shim. In Electron the preload script injects a real `window.liw`
// bridge over IPC; when running in a plain browser (vite dev without electron)
// we fall back to an embedded demo registry so the UI is still browsable.

const CALLS = {
  'liw:search': 'search',
  'liw:package-info': 'packageInfo',
  'liw:marketplace-list': 'marketplaceList',
  'liw:install': 'install',
  'liw:uninstall': 'uninstall',
  'liw:list-installed': 'listInstalled',
  'liw:check-updates': 'checkUpdates',
  'liw:upgrade-all': 'upgradeAll',
  'liw:run': 'run',
  'liw:stop': 'stop',
  'liw:restart': 'restart',
  'liw:enable': 'enable',
  'liw:disable': 'disable',
  'liw:apply': 'apply',
  'liw:conflicts': 'conflicts',
  'liw:preview-nox': 'previewNox',
  'liw:preview-package': 'previewPackage',
  'liw:doctor': 'doctor',
  'liw:backup-list': 'backupList',
  'liw:rollback': 'rollback',
  'liw:settings-get': 'settingsGet',
  'liw:settings-set': 'settingsSet',
  'liw:profiles-list': 'profilesList',
  'liw:profile-use': 'profileUse',
  'liw:collections': 'collections',
  'liw:toggle-favorite': 'toggleFavorite',
  'liw:logs': 'logs',
  'liw:cache-list': 'cacheList',
  'liw:cache-clean': 'cacheClean',
  'liw:terminal-exec': 'terminalExec',
};

function unwrap(r) {
  if (r && typeof r === 'object' && 'ok' in r) {
    if (!r.ok) throw new Error(r.error || 'IPC error');
    return r.data;
  }
  return r;
}

function makeBridge(invoke) {
  const api = {};
  for (const [ch, name] of Object.entries(CALLS)) {
    api[name] = async (payload) => unwrap(await invoke(ch, payload || {}));
  }
  api.onProgress = () => () => {};
  api.onStateChanged = () => () => {};
  return api;
}

// ---- fallback demo data (browser-only) --------------------------------------
import { DEMO_INDEX, DEMO_NOX } from './demo-data.js';

function browserFallback() {
  const installed = new Map();
  let favorites = new Set();
  const emitProgress = null;
  return {
    async search({ query }) {
      const q = String(query || '').toLowerCase();
      return DEMO_INDEX.filter((p) => !q || p.id.includes(q) || p.name.toLowerCase().includes(q) || (p.tags || []).some((t) => t.includes(q)));
    },
    async packageInfo({ id }) { return DEMO_INDEX.find((p) => p.id === id) || null; },
    async marketplaceList() { return DEMO_INDEX; },
    async install({ spec }) {
      const info = DEMO_INDEX.find((p) => p.id === spec);
      if (!info) throw new Error(`package not found in demo registry: ${spec}`);
      installed.set(spec, { ...info, status: 'installed' });
      return { id: spec, version: info.version, ok: true, demo: true };
    },
    async uninstall({ id }) { installed.delete(id); return { ok: true }; },
    async listInstalled() {
      return [...installed.values()].map((p) => ({ id: p.id, name: p.name, version: p.version, status: p.status, size: p.sizeBytes || 0 }));
    },
    async checkUpdates() { return []; },
    async upgradeAll() { return []; },
    async run({ id }) {
      const p = installed.get(id);
      if (!p) throw new Error(`not installed: ${id} (install it first)`);
      p.status = 'running';
      return { ok: true, demo: true, message: `[demo] Windows Terminal would open with profile "${p.name}"` };
    },
    async stop({ id }) { const p = installed.get(id); if (p) p.status = 'stopped'; return { ok: true }; },
    async restart({ id }) { return this.run({ id }); },
    async enable({ id }) { const p = installed.get(id); if (p) p.status = 'installed'; return { ok: true }; },
    async disable({ id }) { const p = installed.get(id); if (p) p.status = 'disabled'; return { ok: true }; },
    async apply() { return { ok: true }; },
    async conflicts() { return []; },
    async previewNox({ source }) {
      // parse + compile happens client-side via @liw/nox browser build
      const { validateNox } = await import('./nox-browser.js');
      const v = validateNox(source);
      if (!v.ok) throw new Error(v.errors.join('; '));
      const { compileForBrowser } = await import('./nox-browser.js');
      return compileForBrowser(source);
    },
    async previewPackage({ id }) {
      const info = DEMO_INDEX.find((p) => p.id === id) || null;
      const src = DEMO_NOX[id];
      let nox = null;
      if (src) {
        try {
          const m = await import('./nox-browser.js');
          nox = m.compileForBrowser(src);
        } catch { nox = null; }
      }
      return { id, manifest: info ? { id, name: info.name, version: info.version, description: info.description, author: info.author } : {}, registry: info, theme: info?.theme || null, nox, previewPng: null };
    },
    async doctor() {
      return { checks: [{ name: 'GUI demo mode', ok: true, note: 'browser fallback — run inside Electron for full doctor' }], warnings: [], errors: [] };
    },
    async backupList() { return []; },
    async rollback() { throw new Error('rollback requires the desktop app'); },
    async settingsGet() { return { theme: 'dark', safeMode: false }; },
    async settingsSet() { return { ok: true }; },
    async profilesList() { return { profiles: { default: { packages: [...installed.keys()] } }, active: 'default' }; },
    async profileUse() { return { ok: true }; },
    async collections() { return { favorites: [...favorites] }; },
    async toggleFavorite({ id }) {
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      return { favorites: [...favorites] };
    },
    async logs() { return ''; },
    async cacheList() { return []; },
    async cacheClean() { return { removed: 0 }; },
    async terminalExec({ line }) {
      return { output: 'mini terminal requires the desktop app (try: linux list)', exitCode: 0 };
    },
    onProgress: () => () => {},
    onStateChanged: () => () => {},
  };
}

export function getApi() {
  if (typeof window !== 'undefined' && window.liw) {
    // preload exposes camelCase methods for each whitelisted channel
    return makeBridge(async (ch, payload) => {
      const name = CALLS[ch];
      if (!name || typeof window.liw[name] !== 'function') throw new Error(`unknown channel: ${ch}`);
      return window.liw[name](payload);
    });
  }
  return browserFallback();
}
