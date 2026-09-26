import { defineStore } from 'pinia';
import { getApi } from '../api.js';

export const useLiwStore = defineStore('liw', {
  state: () => ({
    api: null,
    marketplace: [],
    installed: [],
    updates: [],
    favorites: [],
    progress: null,       // { step, percent, message }
    error: null,
    themePref: 'dark',
    safeMode: false,
    demoMode: false,
    searchQuery: '',
  }),
  getters: {
    byId: (s) => Object.fromEntries(s.marketplace.map((p) => [p.id, p])),
    installedIds: (s) => new Set(s.installed.map((p) => p.id)),
    statusOf() {
      return (id) => this.installed.find((p) => p.id === id)?.status || null;
    },
    filteredMarketplace: (s) => {
      const q = s.searchQuery.trim().toLowerCase();
      if (!q) return s.marketplace;
      return s.marketplace.filter((p) =>
        p.id.includes(q) || (p.name || '').toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (p.category || '').includes(q));
    },
  },
  actions: {
    init() {
      if (this.api) return;
      this.api = getApi();
      this.demoMode = typeof window !== 'undefined' && !window.liw;
      if (this.api.onProgress) {
        this.api.onProgress((data) => { this.progress = data; });
      }
      if (this.api.onStateChanged) {
        this.api.onStateChanged(() => { this.refreshInstalled(); });
      }
      this.refreshAll();
    },
    async call(name, payload) {
      try {
        this.error = null;
        return await this.api[name](payload);
      } catch (e) {
        this.error = e.message || String(e);
        throw e;
      } finally {
        this.progress = null;
      }
    },
    async refreshAll() {
      await Promise.all([this.refreshMarketplace(), this.refreshInstalled(), this.refreshFavorites()]);
      this.checkUpdates();
    },
    async refreshMarketplace() {
      try { this.marketplace = await this.call('marketplaceList'); } catch { /* offline */ }
    },
    async refreshInstalled() {
      try { this.installed = await this.call('listInstalled'); } catch { /* ignore */ }
    },
    async refreshFavorites() {
      try {
        const c = await this.api.collections?.();
        this.favorites = c?.favorites || [];
      } catch { /* ignore */ }
    },
    async checkUpdates() {
      try { this.updates = await this.call('checkUpdates', { offline: false }); } catch { this.updates = []; }
    },
    async install(spec) {
      const r = await this.call('install', { spec });
      await this.refreshInstalled();
      return r;
    },
    async uninstall(id) {
      const r = await this.call('uninstall', { id });
      await this.refreshInstalled();
      return r;
    },
    async run(id) { const r = await this.call('run', { id }); await this.refreshInstalled(); return r; },
    async stop(id) { const r = await this.call('stop', { id }); await this.refreshInstalled(); return r; },
    async enable(id) { const r = await this.call('enable', { id }); await this.refreshInstalled(); return r; },
    async disable(id) { const r = await this.call('disable', { id }); await this.refreshInstalled(); return r; },
    async upgradeAll() { const r = await this.call('upgradeAll'); await this.refreshInstalled(); this.checkUpdates(); return r; },
    async toggleFavorite(id) {
      const r = await this.call('toggleFavorite', { id });
      this.favorites = r?.favorites || this.favorites;
    },
    async previewPackage(id) { return this.call('previewPackage', { id }); },
    async settingsGet() { const s = await this.call('settingsGet'); this.themePref = s.theme || 'dark'; this.safeMode = !!s.safeMode; return s; },
    async settingsSet(key, value) { return this.call('settingsSet', { key, value }); },
  },
});
