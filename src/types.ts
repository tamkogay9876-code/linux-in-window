export type DistroTheme = 'ubuntu' | 'arch' | 'debian' | 'kali' | 'fedora' | 'cyberpunk';

export interface DistroInfo {
  id: DistroTheme;
  name: string;
  codename: string;
  logo: string;
  accentColor: string;
  badgeBg: string;
  kernel: string;
  defaultWallpaper: string;
}

export type AppType = 
  | 'terminal' 
  | 'file-manager' 
  | 'text-editor' 
  | 'sysmon' 
  | 'store' 
  | 'settings' 
  | 'cmatrix' 
  | 'python' 
  | 'help'
  | 'media';

export interface WindowItem {
  id: string;
  title: string;
  appType: AppType;
  icon: string;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  prevBounds?: { x: number; y: number; width: number; height: number };
  zIndex: number;
  initialData?: any;
}

export interface FSNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  content?: string;
  size: number;
  modified: number;
  permissions: string;
  isExecutable?: boolean;
}

export interface TerminalOutputLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'info' | 'success' | 'raw';
  text: string;
  promptCwd?: string;
  rawHtml?: boolean;
}

export interface ProcessItem {
  pid: number;
  user: string;
  priority: number;
  nice: number;
  virt: string;
  res: string;
  cpu: number;
  mem: number;
  time: string;
  command: string;
}
