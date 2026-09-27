import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Folder,
  FileText,
  Activity,
  ShoppingBag,
  Settings,
  Sparkles,
  Code,
  HelpCircle,
  Wifi,
  Volume2,
  Battery,
  Search,
  Power,
  RotateCcw,
  Sliders,
  ExternalLink,
  ChevronUp
} from 'lucide-react';
import { WindowItem, AppType, DistroTheme } from '../types';
import { DISTROS } from '../services/distroConfig';
import { WindowFrame } from './WindowFrame';
import { LinuxTerminal } from './apps/LinuxTerminal';
import { FileManager } from './apps/FileManager';
import { TextEditor } from './apps/TextEditor';
import { SystemMonitor } from './apps/SystemMonitor';
import { LinuxStore } from './apps/LinuxStore';
import { SettingsApp } from './apps/SettingsApp';
import { CMatrixVisualizer } from './apps/CMatrixVisualizer';
import { PythonWorkspace } from './apps/PythonWorkspace';

export const Desktop: React.FC = () => {
  const [distro, setDistro] = useState<DistroTheme>('ubuntu');
  const [wallpaper, setWallpaper] = useState<string>(DISTROS.ubuntu.defaultWallpaper);
  const [windows, setWindows] = useState<WindowItem[]>([
    {
      id: 'win-term-1',
      title: 'Linux Terminal - bash',
      appType: 'terminal',
      icon: 'terminal',
      isMinimized: false,
      isMaximized: false,
      position: { x: 60, y: 50 },
      size: { width: 720, height: 460 },
      zIndex: 10,
    },
  ]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>('win-term-1');
  const [highestZ, setHighestZ] = useState<number>(20);
  const [isStartOpen, setIsStartOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(80);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const startMenuRef = useRef<HTMLDivElement>(null);
  const quickSettingsRef = useRef<HTMLDivElement>(null);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isStartOpen && !target.closest('.start-menu-container') && !target.closest('.start-button')) {
        setIsStartOpen(false);
      }
      if (isQuickSettingsOpen && !target.closest('.quick-settings-container') && !target.closest('.quick-settings-btn')) {
        setIsQuickSettingsOpen(false);
      }
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isStartOpen, isQuickSettingsOpen, contextMenu]);

  const currentDistroInfo = DISTROS[distro] || DISTROS.ubuntu;

  // Open App handler
  const openApp = (appType: AppType, initialData?: any) => {
    setIsStartOpen(false);

    // If already exists and minimized, restore and focus
    const existing = windows.find(w => w.appType === appType && !initialData?.forceNew);
    if (existing) {
      setHighestZ(prev => prev + 1);
      setWindows(prev =>
        prev.map(w => (w.id === existing.id ? { ...w, isMinimized: false, zIndex: highestZ + 1 } : w))
      );
      setActiveWindowId(existing.id);
      return;
    }

    const newId = `win-${appType}-${Date.now()}`;
    const nextZ = highestZ + 1;
    setHighestZ(nextZ);

    const defaultProps: Record<AppType, { title: string; width: number; height: number }> = {
      'terminal': { title: 'Linux Terminal - bash', width: 720, height: 460 },
      'file-manager': { title: 'Files - Virtual Linux Explorer', width: 680, height: 440 },
      'text-editor': { title: 'Text Editor - nano GUI', width: 620, height: 420 },
      'sysmon': { title: 'System Monitor - Resources & Processes', width: 700, height: 480 },
      'store': { title: 'Linux Software Store', width: 720, height: 500 },
      'settings': { title: 'System Settings', width: 620, height: 420 },
      'cmatrix': { title: 'CMatrix - Matrix Rain', width: 640, height: 420 },
      'python': { title: 'Python 3.12 Workspace', width: 700, height: 460 },
      'help': { title: 'Linux in Window Quick Guide', width: 600, height: 400 },
      'media': { title: 'Media Viewer', width: 500, height: 400 },
    };

    const cfg = defaultProps[appType] || { title: appType, width: 600, height: 400 };

    const offset = (windows.length % 6) * 28;
    const initialX = Math.min(Math.max(40 + offset, 20), window.innerWidth - cfg.width - 20);
    const initialY = Math.min(Math.max(40 + offset, 20), window.innerHeight - cfg.height - 60);

    const newWin: WindowItem = {
      id: newId,
      title: cfg.title,
      appType,
      icon: appType,
      isMinimized: false,
      isMaximized: false,
      position: { x: initialX, y: initialY },
      size: { width: cfg.width, height: cfg.height },
      zIndex: nextZ,
      initialData,
    };

    setWindows(prev => [...prev, newWin]);
    setActiveWindowId(newId);
  };

  const focusWindow = (id: string) => {
    setHighestZ(prev => prev + 1);
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, zIndex: highestZ + 1 } : w))
    );
    setActiveWindowId(id);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  const minimizeWindow = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w))
    );
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  const toggleMaximizeWindow = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  const updateWindowBounds = (id: string, bounds: { position?: { x: number; y: number }; size?: { width: number; height: number } }) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, ...bounds } : w))
    );
  };

  const handleTaskbarItemClick = (win: WindowItem) => {
    if (win.isMinimized) {
      setHighestZ(prev => prev + 1);
      setWindows(prev =>
        prev.map(w => (w.id === win.id ? { ...w, isMinimized: false, zIndex: highestZ + 1 } : w))
      );
      setActiveWindowId(win.id);
    } else if (activeWindowId === win.id) {
      minimizeWindow(win.id);
    } else {
      focusWindow(win.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const desktopIcons = [
    { appType: 'terminal' as AppType, label: 'Terminal', icon: <Terminal className="w-6 h-6 text-emerald-400" /> },
    { appType: 'file-manager' as AppType, label: 'Files', icon: <Folder className="w-6 h-6 text-amber-400" /> },
    { appType: 'text-editor' as AppType, label: 'Text Editor', icon: <FileText className="w-6 h-6 text-sky-400" /> },
    { appType: 'sysmon' as AppType, label: 'System Monitor', icon: <Activity className="w-6 h-6 text-rose-400" /> },
    { appType: 'store' as AppType, label: 'Software Store', icon: <ShoppingBag className="w-6 h-6 text-violet-400" /> },
    { appType: 'python' as AppType, label: 'Python 3', icon: <Code className="w-6 h-6 text-yellow-400" /> },
    { appType: 'cmatrix' as AppType, label: 'CMatrix', icon: <Sparkles className="w-6 h-6 text-green-400" /> },
    { appType: 'settings' as AppType, label: 'Settings', icon: <Settings className="w-6 h-6 text-slate-300" /> },
  ];

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ background: wallpaper }}
      className="relative w-full h-full overflow-hidden select-none font-sans text-slate-100 flex flex-col justify-between"
    >
      {/* Desktop Workspace Area with Icons */}
      <div className="flex-1 relative overflow-hidden p-4">
        {/* Desktop Shortcuts Column */}
        <div className="grid grid-flow-col grid-rows-6 gap-3 w-fit">
          {desktopIcons.map(icon => (
            <button
              key={icon.appType}
              onDoubleClick={() => openApp(icon.appType)}
              onClick={(e) => { e.stopPropagation(); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all w-20 h-20 text-center group border border-transparent hover:border-white/10"
            >
              <div className="p-2 rounded-xl bg-slate-900/60 backdrop-blur-md shadow-md group-hover:scale-110 transition-transform">
                {icon.icon}
              </div>
              <span className="text-[11px] font-medium text-white drop-shadow mt-1 truncate w-full px-1">
                {icon.label}
              </span>
            </button>
          ))}
        </div>

        {/* Windows Rendering */}
        {windows.map(win => (
          <WindowFrame
            key={win.id}
            window={win}
            isActive={activeWindowId === win.id}
            distro={distro}
            onFocus={() => focusWindow(win.id)}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onToggleMaximize={() => toggleMaximizeWindow(win.id)}
            onUpdateBounds={updateWindowBounds}
          >
            {win.appType === 'terminal' && (
              <LinuxTerminal
                distro={distro}
                openApp={openApp}
                initialCommand={win.initialData?.initialCommand}
              />
            )}
            {win.appType === 'file-manager' && (
              <FileManager
                openApp={openApp}
                initialPath={win.initialData?.initialPath}
              />
            )}
            {win.appType === 'text-editor' && (
              <TextEditor
                filePath={win.initialData?.filePath}
                openApp={openApp}
              />
            )}
            {win.appType === 'sysmon' && <SystemMonitor />}
            {win.appType === 'store' && <LinuxStore openApp={openApp} />}
            {win.appType === 'settings' && (
              <SettingsApp
                currentDistro={distro}
                onChangeDistro={setDistro}
                wallpaper={wallpaper}
                onChangeWallpaper={setWallpaper}
              />
            )}
            {win.appType === 'cmatrix' && <CMatrixVisualizer />}
            {win.appType === 'python' && <PythonWorkspace />}
          </WindowFrame>
        ))}

        {/* Desktop Context Menu */}
        {contextMenu && (
          <div
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            className="absolute z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl p-1.5 w-48 text-xs text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { openApp('terminal'); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-left"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open Terminal Here</span>
            </button>
            <button
              onClick={() => { openApp('file-manager'); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-left"
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Open File Manager</span>
            </button>
            <button
              onClick={() => { openApp('text-editor'); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-left"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>New Text Document</span>
            </button>
            <div className="h-[1px] bg-slate-800 my-1" />
            <button
              onClick={() => { openApp('settings'); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-left"
            >
              <Settings className="w-3.5 h-3.5 text-slate-300" />
              <span>Change Wallpaper / OS</span>
            </button>
            <button
              onClick={() => { openApp('sysmon'); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-800 text-left"
            >
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>System Monitor</span>
            </button>
          </div>
        )}

        {/* Start Menu Popup */}
        {isStartOpen && (
          <div
            ref={startMenuRef}
            className="start-menu-container absolute bottom-3 left-3 w-96 max-h-[520px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Profile Header */}
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md">
                  U
                </div>
                <div>
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    user@linux-in-window
                    <span className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">online</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{currentDistroInfo.name} ({currentDistroInfo.codename})</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setWindows([]);
                  setActiveWindowId(null);
                  setIsStartOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Reset/Close all windows"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 focus-within:border-sky-500">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type to search apps or files..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent text-white outline-none w-full text-xs"
                  autoFocus
                />
              </div>
            </div>

            {/* Pinned Applications */}
            <div className="p-3 overflow-y-auto max-h-[300px]">
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-2 block">
                Applications
              </span>
              <div className="grid grid-cols-2 gap-2">
                {desktopIcons
                  .filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <button
                      key={item.appType}
                      onClick={() => openApp(item.appType)}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/80 border border-transparent hover:border-slate-700/50 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded bg-slate-800">
                        {React.cloneElement(item.icon, { className: 'w-4 h-4' })}
                      </div>
                      <span className="font-medium text-slate-200 truncate">{item.label}</span>
                    </button>
                  ))}
              </div>

              {/* Recommended Sample Scripts */}
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-4 mb-2 block">
                Sample Files
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => openApp('terminal', { initialCommand: 'sh /home/user/demo.sh' })}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <div>
                      <div className="font-medium text-slate-200">demo.sh</div>
                      <div className="text-[10px] text-slate-400">System health check script</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Run</span>
                </button>
                <button
                  onClick={() => openApp('terminal', { initialCommand: 'python3 /home/user/calculator.py' })}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-yellow-400" />
                    <div>
                      <div className="font-medium text-slate-200">calculator.py</div>
                      <div className="text-[10px] text-slate-400">Python 3 statistics demo</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-yellow-400 font-mono">Run</span>
                </button>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono">Linux Kernel 6.8.0</span>
              <button
                onClick={() => openApp('settings')}
                className="flex items-center gap-1 hover:text-white"
              >
                <Settings className="w-3 h-3" /> Settings
              </button>
            </div>
          </div>
        )}

        {/* Quick Settings Slider Center */}
        {isQuickSettingsOpen && (
          <div
            ref={quickSettingsRef}
            className="quick-settings-container absolute bottom-3 right-3 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-50 p-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-slate-100">Quick Settings</span>
              <span className="text-[10px] text-slate-400 font-mono">linux-in-window</span>
            </div>

            <div className="space-y-3">
              {/* Volume Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-sky-400" /> Master Volume</span>
                  <span className="font-mono">{volumeLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volumeLevel}
                  onChange={e => setVolumeLevel(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Distro Quick Switch */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1.5">Distribution</span>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {(['ubuntu', 'arch', 'debian', 'kali', 'fedora', 'cyberpunk'] as DistroTheme[]).map(theme => (
                    <button
                      key={theme}
                      onClick={() => {
                        setDistro(theme);
                        setWallpaper(DISTROS[theme].defaultWallpaper);
                      }}
                      className={`py-1 px-1.5 rounded font-medium capitalize text-center truncate ${
                        distro === theme
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Taskbar */}
      <div className="h-12 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 px-2 flex items-center justify-between z-40 select-none">
        {/* Start Button & Search */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsStartOpen(!isStartOpen)}
            className={`start-button flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              isStartOpen
                ? 'bg-sky-600 text-white shadow-md'
                : 'hover:bg-slate-800 text-slate-200'
            }`}
            title="Start Menu"
          >
            <span className="text-base">{currentDistroInfo.logo}</span>
            <span className="text-xs font-semibold tracking-wide">Linux</span>
          </button>

          <button
            onClick={() => setIsStartOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs w-44"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">Search commands...</span>
          </button>
        </div>

        {/* Running Windows Taskbar Tabs */}
        <div className="flex-1 flex items-center gap-1 px-2 overflow-x-auto max-w-2xl">
          {windows.map(win => {
            const isActive = activeWindowId === win.id && !win.isMinimized;
            return (
              <button
                key={win.id}
                onClick={() => handleTaskbarItemClick(win)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all border max-w-[160px] truncate ${
                  isActive
                    ? 'bg-slate-800/90 text-white border-slate-600 shadow-sm font-medium'
                    : win.isMinimized
                    ? 'bg-slate-950/40 text-slate-500 border-slate-800 hover:bg-slate-900'
                    : 'bg-slate-900/60 text-slate-300 border-slate-800/80 hover:bg-slate-800/50'
                }`}
              >
                {win.appType === 'terminal' && <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                {win.appType === 'file-manager' && <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                {win.appType === 'text-editor' && <FileText className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
                {win.appType === 'sysmon' && <Activity className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                {win.appType === 'store' && <ShoppingBag className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
                {win.appType === 'settings' && <Settings className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                {win.appType === 'cmatrix' && <Sparkles className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                {win.appType === 'python' && <Code className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                <span className="truncate">{win.title.split(' - ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* System Tray (Clock, Sound, WiFi, Quick Settings) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
            className="quick-settings-btn flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            <Battery className="w-3.5 h-3.5 text-slate-300" />
          </button>

          {/* Clock & Date */}
          <div className="flex flex-col items-end px-2 py-0.5 rounded hover:bg-slate-800 text-right cursor-default">
            <span className="text-xs font-semibold text-slate-200">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] text-slate-400">
              {currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Show Desktop Peek line */}
          <div
            onClick={() => {
              const allMinimized = windows.every(w => w.isMinimized);
              setWindows(prev => prev.map(w => ({ ...w, isMinimized: !allMinimized })));
            }}
            className="w-1.5 h-8 bg-slate-800 hover:bg-sky-500 rounded cursor-pointer ml-1 transition-colors"
            title="Show Desktop"
          />
        </div>
      </div>
    </div>
  );
};
