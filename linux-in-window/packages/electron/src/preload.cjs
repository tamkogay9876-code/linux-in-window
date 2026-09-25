// Preload: expose a safe, promise-based `window.liw` bridge to the renderer.
// Only whitelisted IPC channels are forwarded — never raw ipcRenderer.
const { contextBridge, ipcRenderer } = require('electron');

const CHANNELS = [
  'liw:search', 'liw:package-info', 'liw:marketplace-list',
  'liw:install', 'liw:uninstall', 'liw:list-installed',
  'liw:check-updates', 'liw:upgrade-all',
  'liw:run', 'liw:stop', 'liw:restart', 'liw:enable', 'liw:disable',
  'liw:apply', 'liw:conflicts',
  'liw:preview-nox', 'liw:preview-package',
  'liw:doctor', 'liw:backup-list', 'liw:rollback',
  'liw:settings-get', 'liw:settings-set',
  'liw:profiles-list', 'liw:profile-use',
  'liw:collections', 'liw:toggle-favorite',
  'liw:logs', 'liw:cache-list', 'liw:cache-clean',
  'liw:terminal-exec',
];

const api = {};
for (const ch of CHANNELS) {
  const name = ch.replace(/^liw:/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  api[name] = (payload) => ipcRenderer.invoke(ch, payload);
}

api.onProgress = (cb) => {
  const h = (_e, data) => cb(data);
  ipcRenderer.on('liw:progress', h);
  return () => ipcRenderer.removeListener('liw:progress', h);
};
api.onStateChanged = (cb) => {
  const h = () => cb();
  ipcRenderer.on('liw:state-changed', h);
  return () => ipcRenderer.removeListener('liw:state-changed', h);
};

contextBridge.exposeInMainWorld('liw', api);
