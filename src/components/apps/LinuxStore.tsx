import React, { useState } from 'react';
import { ShoppingBag, Check, Download, Play, Sparkles, Terminal, Code, Cpu } from 'lucide-react';

interface StorePackage {
  id: string;
  name: string;
  category: 'Tools' | 'Terminal Toys' | 'Dev' | 'System';
  description: string;
  version: string;
  size: string;
  icon: string;
  isInstalled: boolean;
  command: string;
}

interface LinuxStoreProps {
  openApp: (appType: any, data?: any) => void;
}

export const LinuxStore: React.FC<LinuxStoreProps> = ({ openApp }) => {
  const [packages, setPackages] = useState<StorePackage[]>([
    {
      id: 'cmatrix',
      name: 'CMatrix',
      category: 'Terminal Toys',
      description: 'Simulates the iconic falling green digital rain from The Matrix movies inside your terminal.',
      version: '2.0.1',
      size: '142 KB',
      icon: '🟢',
      isInstalled: true,
      command: 'cmatrix',
    },
    {
      id: 'neofetch',
      name: 'Neofetch / Fastfetch',
      category: 'System',
      description: 'CLI system information tool displaying hardware info alongside your Linux distribution ASCII logo.',
      version: '7.1.0',
      size: '220 KB',
      icon: '🐧',
      isInstalled: true,
      command: 'neofetch',
    },
    {
      id: 'htop',
      name: 'htop Process Viewer',
      category: 'System',
      description: 'Interactive and colorful process viewer and system resource monitor for Linux.',
      version: '3.3.0',
      size: '480 KB',
      icon: '📊',
      isInstalled: true,
      command: 'htop',
    },
    {
      id: 'cowsay',
      name: 'Cowsay',
      category: 'Terminal Toys',
      description: 'Generates an ASCII graphic of a cow stating a message provided by the user.',
      version: '3.7.0',
      size: '45 KB',
      icon: '🐮',
      isInstalled: true,
      command: 'cowsay "Linux in Window is awesome!"',
    },
    {
      id: 'sl',
      name: 'Steam Locomotive (sl)',
      category: 'Terminal Toys',
      description: 'Runs a steam train across your terminal screen when you mistakenly type "sl" instead of "ls".',
      version: '5.0.2',
      size: '32 KB',
      icon: '🚂',
      isInstalled: true,
      command: 'sl',
    },
    {
      id: 'fortune',
      name: 'Fortune Mod',
      category: 'Terminal Toys',
      description: 'Displays a humorous or inspirational random quote or proverb from unix archives.',
      version: '1.99.1',
      size: '1.2 MB',
      icon: '🥠',
      isInstalled: true,
      command: 'fortune',
    },
    {
      id: 'figlet',
      name: 'Figlet ASCII Banner',
      category: 'Tools',
      description: 'Generates large ASCII text banners out of regular text strings.',
      version: '2.2.5',
      size: '180 KB',
      icon: '🔤',
      isInstalled: true,
      command: 'figlet "LINUX"',
    },
    {
      id: 'tree',
      name: 'Tree Directory Visualizer',
      category: 'Tools',
      description: 'Recursive directory listing program that produces a depth-indented listing of files.',
      version: '2.1.1',
      size: '95 KB',
      icon: '🌳',
      isInstalled: true,
      command: 'tree /home/user',
    },
    {
      id: 'python3',
      name: 'Python 3.12 Runtime',
      category: 'Dev',
      description: 'Full high-level programming language environment with interactive REPL and script executor.',
      version: '3.12.3',
      size: '18.4 MB',
      icon: '🐍',
      isInstalled: true,
      command: 'python3 /home/user/calculator.py',
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const toggleInstall = (pkgId: string) => {
    setPackages(prev =>
      prev.map(p => (p.id === pkgId ? { ...p, isInstalled: !p.isInstalled } : p))
    );
  };

  const filtered = packages.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none text-xs">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-violet-400" />
          <h2 className="font-semibold text-slate-100 text-sm">Ubuntu / Linux Software Center</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search software packages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 w-52"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 overflow-x-auto">
        {['All', 'Terminal Toys', 'Tools', 'System', 'Dev'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Package List */}
      <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(pkg => (
          <div
            key={pkg.id}
            className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pkg.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-100 text-xs">{pkg.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>v{pkg.version}</span>
                      <span>•</span>
                      <span>{pkg.size}</span>
                      <span>•</span>
                      <span className="text-violet-400">{pkg.category}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
                {pkg.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-mono text-slate-500">
                $ {pkg.id}
              </span>
              <div className="flex items-center gap-2">
                {pkg.isInstalled && (
                  <button
                    onClick={() => {
                      if (pkg.id === 'cmatrix') {
                        openApp('cmatrix');
                      } else if (pkg.id === 'htop') {
                        openApp('sysmon');
                      } else {
                        openApp('terminal', { initialCommand: pkg.command });
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium text-xs transition-colors"
                  >
                    <Play className="w-3 h-3" /> Run
                  </button>
                )}
                <button
                  onClick={() => toggleInstall(pkg.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded font-medium text-xs transition-colors ${
                    pkg.isInstalled
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-rose-600/20 hover:text-rose-300 hover:border-rose-500/40'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                >
                  {pkg.isInstalled ? (
                    <>
                      <Check className="w-3 h-3" /> Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" /> Install
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
