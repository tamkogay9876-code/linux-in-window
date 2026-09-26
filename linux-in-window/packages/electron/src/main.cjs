// Linux in Window — Electron main process.
// CommonJS (.cjs) so it can be loaded directly by Electron without a build step,
// while @liw/core / @liw/nox are pure ESM and loaded via dynamic import().
//
// All business logic lives in @liw/core; this file only wires IPC channels to it,
// exactly like the CLI does — GUI and CLI can never diverge.

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, ipcMain, shell } = require('electron');

let core = null; // @liw/core namespace (loaded lazily via import())
let nox = null;  // @liw/nox namespace

async function loadModules() {
  if (!core) core = await import('@liw/core');
  if (!nox) nox = await import('@liw/nox');
}

const isDev = !app.isPackaged;
const GUI_DIST = path.resolve(__dirname, '../../gui/dist');

let win = null;

function sendProgress(data) {
  if (win && !win.isDestroyed()) win.webContents.send('liw:progress', data);
}
function sendStateChanged() {
  if (win && !win.isDestroyed()) win.webContents.send('liw:state-changed');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0b0b10',
    autoHideMenuBar: true,
    title: 'Linux in Window',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && process.env.LIW_GUI_URL) {
    win.loadURL(process.env.LIW_GUI_URL); // vite dev server
  } else if (fs.existsSync(path.join(GUI_DIST, 'index.html'))) {
    win.loadFile(path.join(GUI_DIST, 'index.html'));
  } else {
    win.loadFile(path.join(__dirname, 'fallback.html'));
  }

  // open external links in the default browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ---------------------------------------------------------------------------
// IPC handlers — thin wrappers over @liw/core
// ---------------------------------------------------------------------------

function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, payload) => {
    try {
      await loadModules();
      return { ok: true, data: await fn(payload || {}) };
    } catch (e) {
      return { ok: false, error: e.message || String(e), code: e.code };
    }
  });
}

function registerIpc() {
  // ---- marketplace -------------------------------------------------------
  handle('liw:search', async ({ query }) => core.registrySearch(query));
  handle('liw:package-info', async ({ id }) => core.registryInfo(id));
  handle('liw:marketplace-list', async () => core.localRegistryIndex());

  // ---- package management ------------------------------------------------
  handle('liw:install', async ({ spec, allowElevated }) => {
    const r = await core.install(spec, {
      allowElevated: !!allowElevated,
      onProgress: sendProgress,
    });
    sendStateChanged();
    return r;
  });
  handle('liw:uninstall', async ({ id }) => {
    const r = core.uninstall(id);
    sendStateChanged();
    return r;
  });
  handle('liw:list-installed', async () => core.listInstalled());
  handle('liw:check-updates', async ({ offline }) => core.checkUpdates({ offline: !!offline }));
  handle('liw:upgrade-all', async () => {
    const results = await core.upgradeAll({ allowElevated: true, onProgress: sendProgress });
    sendStateChanged();
    return results;
  });

  // ---- runtime -----------------------------------------------------------
  handle('liw:run', async ({ id }) => {
    const r = await core.runPackage(id);
    sendStateChanged();
    return r;
  });
  handle('liw:stop', async ({ id }) => { const r = core.stopPackage(id); sendStateChanged(); return r; });
  handle('liw:restart', async ({ id }) => { const r = await core.restartPackage(id); sendStateChanged(); return r; });
  handle('liw:enable', async ({ id }) => { const r = core.enablePackage(id); sendStateChanged(); return r; });
  handle('liw:disable', async ({ id }) => { const r = core.disablePackage(id); sendStateChanged(); return r; });
  handle('liw:apply', async () => { const r = core.applyAll(); sendStateChanged(); return r; });
  handle('liw:conflicts', async () => {
    const cfg = core.effectiveConfig({ safeMode: core.loadSettings().safeMode });
    return cfg.conflicts;
  });

  // ---- preview -----------------------------------------------------------
  handle('liw:preview-nox', async ({ source }) => {
    const v = nox.validateNox(source);
    if (!v.ok) throw new Error(v.errors.join('; '));
    return nox.compileForBrowser(source);
  });
  handle('liw:preview-package', async ({ id }) => {
    const dir = core.paths.packages(id);
    const manifest = fs.existsSync(dir) ? core.readJsonSafe(path.join(dir, 'package.json'), {}) : {};
    const theme = fs.existsSync(dir) ? core.readPackageTheme(dir) : null;
    const reg = await core.registryInfo(id).catch(() => null);
    let noxProgram = null;
    const noxFile = path.join(dir, 'nox', 'main.nox');
    if (fs.existsSync(noxFile)) {
      try { noxProgram = nox.compileForBrowser(fs.readFileSync(noxFile, 'utf8')); } catch { /* broken nox: ignore for preview */ }
    }
    let previewPng = null;
    const png = path.join(dir, 'preview.png');
    if (fs.existsSync(png)) previewPng = fs.readFileSync(png).toString('base64');
    return { id, manifest, registry: reg, theme, nox: noxProgram, previewPng };
  });

  // ---- system ------------------------------------------------------------
  handle('liw:doctor', async () => core.runDoctor());
  handle('liw:backup-list', async () => core.listBackups());
  handle('liw:rollback', async ({ backupId }) => { const r = core.rollback(backupId || null); sendStateChanged(); return r; });
  handle('liw:settings-get', async () => core.loadSettings());
  handle('liw:settings-set', async ({ key, value }) => core.setSetting(key, value));
  handle('liw:profiles-list', async () => ({
    profiles: core.loadProfiles(),
    active: core.activeProfile(),
  }));
  handle('liw:profile-use', async ({ name }) => { const r = core.useProfileAndApply(name); sendStateChanged(); return r; });
  handle('liw:collections', async () => core.loadCollections());
  handle('liw:toggle-favorite', async ({ id }) => core.toggleFavorite(id));
  handle('liw:logs', async ({ id, lines }) => core.readLog(id, lines || 100));
  handle('liw:cache-list', async () => core.cacheList());
  handle('liw:cache-clean', async () => core.cacheClean());

  // mini terminal: run `linux <args>` through the CLI implementation
  handle('liw:terminal-exec', async ({ line }) => {
    const cliPath = path.resolve(__dirname, '../../cli/src/index.js');
    const { execFile } = require('node:child_process');
    const args = String(line).trim().split(/\s+/).filter(Boolean);
    if (args[0] === 'linux') args.shift();
    return new Promise((resolve) => {
      execFile(process.execPath, [cliPath, ...args], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', FORCE_COLOR: '0', NO_COLOR: '1' },
        timeout: 30000,
      }, (err, stdout, stderr) => {
        resolve({
          output: (stdout + stderr).replace(/\u001b\[[0-9;]*m/g, '').trimEnd(),
          exitCode: err ? (err.code ?? 1) : 0,
        });
      });
    });
  });
}

// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
