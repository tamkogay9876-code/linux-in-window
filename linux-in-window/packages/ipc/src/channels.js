// Single source of truth for renderer <-> main IPC channels.
export const CHANNELS = {
  // marketplace / registry
  SEARCH: 'liw:search',
  PACKAGE_INFO: 'liw:package-info',
  MARKETPLACE_LIST: 'liw:marketplace-list',
  // package management
  INSTALL: 'liw:install',
  UNINSTALL: 'liw:uninstall',
  LIST_INSTALLED: 'liw:list-installed',
  CHECK_UPDATES: 'liw:check-updates',
  UPGRADE_ALL: 'liw:upgrade-all',
  // runtime
  RUN: 'liw:run',
  STOP: 'liw:stop',
  RESTART: 'liw:restart',
  ENABLE: 'liw:enable',
  DISABLE: 'liw:disable',
  APPLY: 'liw:apply',
  CONFLICTS: 'liw:conflicts',
  // preview
  PREVIEW_NOX: 'liw:preview-nox',
  PREVIEW_PACKAGE: 'liw:preview-package',
  // system
  DOCTOR: 'liw:doctor',
  BACKUP_LIST: 'liw:backup-list',
  ROLLBACK: 'liw:rollback',
  SETTINGS_GET: 'liw:settings-get',
  SETTINGS_SET: 'liw:settings-set',
  PROFILES_LIST: 'liw:profiles-list',
  PROFILE_USE: 'liw:profile-use',
  COLLECTIONS: 'liw:collections',
  TOGGLE_FAVORITE: 'liw:toggle-favorite',
  LOGS: 'liw:logs',
  CACHE_LIST: 'liw:cache-list',
  CACHE_CLEAN: 'liw:cache-clean',
  TERMINAL_EXEC: 'liw:terminal-exec',   // mini terminal runs `linux ...` commands
  // events (main -> renderer)
  EVENT_PROGRESS: 'liw:progress',
  EVENT_STATE: 'liw:state-changed',
};

export const PACKAGE_STATUSES = [
  'installed', 'running', 'stopped', 'disabled', 'broken', 'outdated', 'blocked',
];
