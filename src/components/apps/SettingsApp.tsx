import React, { useState } from 'react';
import { Settings, Monitor, HardDrive, RefreshCw, Palette, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DistroTheme } from '../../types';
import { DISTROS } from '../../services/distroConfig';
import { virtualFS } from '../../services/virtualFs';

interface SettingsAppProps {
  currentDistro: DistroTheme;
  onChangeDistro: (distro: DistroTheme) => void;
  wallpaper: string;
  onChangeWallpaper: (wp: string) => void;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({
  currentDistro,
  onChangeDistro,
  wallpaper,
  onChangeWallpaper,
}) => {
  const [activeTab, setActiveTab] = useState<'distro' | 'appearance' | 'storage' | 'about'>('distro');
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const wallpapersList = [
    { name: 'Ubuntu Aubergine', value: 'linear-gradient(135deg, #2c001e 0%, #77216f 50%, #5e2750 100%)' },
    { name: 'Arch Nordic Night', value: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #0d1b2a 100%)' },
    { name: 'Debian Velvet', value: 'linear-gradient(135deg, #161a1d 0%, #301b28 50%, #0f1416 100%)' },
    { name: 'Kali Midnight Abyss', value: 'linear-gradient(135deg, #050b14 0%, #0d1f36 50%, #02060d 100%)' },
    { name: 'Fedora Cosmic Blue', value: 'linear-gradient(135deg, #0b1a30 0%, #1c3d5a 50%, #0e2038 100%)' },
    { name: 'Cyberpunk Neon Matrix', value: 'linear-gradient(135deg, #1a0826 0%, #2b0c3d 40%, #051622 100%)' },
    { name: 'Minimal Charcoal', value: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #0f172a 100%)' },
  ];

  const handleResetVFS = () => {
    if (window.confirm('Are you sure you want to reset the virtual Linux filesystem to defaults? All custom files in /home/user will be restored.')) {
      virtualFS.reset();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div className="flex h-full bg-slate-900 text-slate-200 select-none text-xs">
      {/* Sidebar */}
      <div className="w-44 bg-slate-950 border-r border-slate-800 p-2 flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-slate-400 px-2 py-1 tracking-wider uppercase">
          Settings
        </span>
        <button
          onClick={() => setActiveTab('distro')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors ${
            activeTab === 'distro' ? 'bg-sky-600/30 text-sky-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Monitor className="w-3.5 h-3.5 text-sky-400" />
          <span>Distro Switcher</span>
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors ${
            activeTab === 'appearance' ? 'bg-sky-600/30 text-sky-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-pink-400" />
          <span>Wallpaper & Style</span>
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors ${
            activeTab === 'storage' ? 'bg-sky-600/30 text-sky-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          <span>Storage & Reset</span>
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors ${
            activeTab === 'about' ? 'bg-sky-600/30 text-sky-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>About Linux</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        {activeTab === 'distro' && (
          <div>
            <h2 className="text-sm font-semibold text-slate-100 mb-1">Linux Distribution Target</h2>
            <p className="text-slate-400 text-[11px] mb-4">
              Select your desired Linux flavor. This updates Neofetch kernel identification, system banners, and environment defaults.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(DISTROS) as DistroTheme[]).map(key => {
                const item = DISTROS[key];
                const isSelected = currentDistro === key;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      onChangeDistro(key);
                      onChangeWallpaper(item.defaultWallpaper);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-sky-600/25 border-sky-500 shadow-md ring-1 ring-sky-400/30'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-3xl">{item.logo}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-100 text-xs">{item.name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400">{item.codename}</span>
                      <p className="text-[10px] font-mono text-slate-500 mt-1 truncate">{item.kernel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div>
            <h2 className="text-sm font-semibold text-slate-100 mb-1">Desktop Wallpaper</h2>
            <p className="text-slate-400 text-[11px] mb-4">
              Choose the backdrop for your Linux in Window workspace.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {wallpapersList.map((wp, idx) => (
                <div
                  key={idx}
                  onClick={() => onChangeWallpaper(wp.value)}
                  className={`flex flex-col gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    wallpaper === wp.value
                      ? 'border-sky-500 bg-sky-600/20'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div
                    style={{ background: wp.value }}
                    className="h-20 w-full rounded shadow-inner"
                  />
                  <span className="text-center font-medium text-xs text-slate-300 truncate">
                    {wp.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div>
            <h2 className="text-sm font-semibold text-slate-100 mb-1">Virtual File System Storage</h2>
            <p className="text-slate-400 text-[11px] mb-4">
              The Linux virtual filesystem is stored in client browser storage and persists between sessions.
            </p>

            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-200">Local VFS Node Count</span>
                <span className="font-mono text-sky-400">{virtualFS.getAllFilesList().length} files & dirs</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-200">Emulated Root Partition</span>
                <span className="font-mono text-emerald-400">/dev/nvme0n1p2 (ext4)</span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Reset Virtual Environment</span>
              </div>
              <p className="text-slate-400 text-[11px] mb-3">
                If you made edits or deleted files and wish to restore the pristine initial file structure with sample scripts, click reset below.
              </p>
              <button
                onClick={handleResetVFS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Filesystem
              </button>
              {resetSuccess && (
                <span className="text-emerald-400 text-xs ml-3">
                  ✓ Filesystem reset successfully!
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-100 mb-1">About Linux in Window</h2>
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Operating System</span>
                <span className="font-medium text-slate-200">Linux in Window v24.04</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Host Environment</span>
                <span className="font-medium text-slate-200">AI Studio Web Workspace</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Runtime</span>
                <span className="font-medium text-slate-200">Node.js 22 + React 18 + Vite</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Architecture</span>
                <span className="font-medium text-slate-200">x86_64 Virtualized Userspace</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Shell Version</span>
                <span className="font-medium text-slate-200">GNU bash, version 5.2.21</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
