import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Plus, X, Play, RotateCcw, Sparkles, HelpCircle } from 'lucide-react';
import { DistroTheme, TerminalOutputLine } from '../../types';
import { shellEngine, ShellContext } from '../../services/shellEngine';
import { virtualFS } from '../../services/virtualFs';

interface TerminalTab {
  id: string;
  title: string;
  cwd: string;
  history: string[];
  historyIndex: number;
  lines: TerminalOutputLine[];
}

interface LinuxTerminalProps {
  distro: DistroTheme;
  openApp: (appType: any, data?: any) => void;
  initialCommand?: string;
}

export const LinuxTerminal: React.FC<LinuxTerminalProps> = ({ distro, openApp, initialCommand }) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'tab-1',
      title: 'bash: /home/user',
      cwd: '/home/user',
      history: [],
      historyIndex: -1,
      lines: [
        {
          id: 'welcome-1',
          type: 'info',
          text: 'Linux in Window Terminal v24.04 (x86_64-pc-linux-gnu)',
        },
        {
          id: 'welcome-2',
          type: 'info',
          text: 'Type "help" for command catalog or "neofetch" to inspect system hardware & kernel.',
        },
        {
          id: 'welcome-3',
          type: 'output',
          text: '',
        },
      ],
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputValue, setInputValue] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Auto-scroll on output
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab?.lines]);

  // Focus input on mount or tab change
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTabId]);

  // Initial command runner
  useEffect(() => {
    if (initialCommand) {
      handleRunCommand(initialCommand);
    }
  }, []);

  const handleRunCommand = async (commandToRun: string) => {
    if (!commandToRun.trim() || isExecuting) return;
    setIsExecuting(true);

    const promptText = shellEngine.getPrompt(activeTab.cwd);
    const newLines: TerminalOutputLine[] = [
      ...activeTab.lines,
      {
        id: Math.random().toString(),
        type: 'input',
        text: commandToRun,
        promptCwd: promptText,
      },
    ];

    const ctx: ShellContext = {
      cwd: activeTab.cwd,
      distro,
      history: activeTab.history,
      installedPackages: new Set(['cmatrix', 'sl', 'cowsay', 'fortune', 'neofetch', 'figlet', 'tree', 'htop']),
      env: {
        USER: 'user',
        HOME: '/home/user',
        PWD: activeTab.cwd,
        SHELL: '/bin/bash',
        TERM: 'xterm-256color',
      },
      openApp,
      clearTerminal: () => {
        setTabs(prev =>
          prev.map(t =>
            t.id === activeTabId
              ? { ...t, lines: [] }
              : t
          )
        );
      },
      startTime: Date.now() - 3600000,
    };

    try {
      const result = await shellEngine.execute(commandToRun, ctx);
      const nextCwd = result.newCwd || activeTab.cwd;
      const displayTitle = `bash: ${nextCwd === '/home/user' ? '~' : nextCwd.split('/').pop() || '/'}`;

      setTabs(prev =>
        prev.map(t =>
          t.id === activeTabId
            ? {
                ...t,
                cwd: nextCwd,
                title: displayTitle,
                history: [...t.history, commandToRun],
                historyIndex: -1,
                lines: [...newLines, ...result.lines],
              }
            : t
        )
      );
    } catch (e: any) {
      setTabs(prev =>
        prev.map(t =>
          t.id === activeTabId
            ? {
                ...t,
                lines: [
                  ...newLines,
                  { id: Math.random().toString(), type: 'error', text: `bash: ${e.message}` },
                ],
              }
            : t
        )
      );
    } finally {
      setIsExecuting(false);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter to execute
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRunCommand(inputValue);
      return;
    }

    // Ctrl + L: clear
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setTabs(prev =>
        prev.map(t => (t.id === activeTabId ? { ...t, lines: [] } : t))
      );
      return;
    }

    // Ctrl + C: cancel line
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const promptText = shellEngine.getPrompt(activeTab.cwd);
      setTabs(prev =>
        prev.map(t =>
          t.id === activeTabId
            ? {
                ...t,
                lines: [
                  ...t.lines,
                  { id: Math.random().toString(), type: 'input', text: inputValue + '^C', promptCwd: promptText },
                ],
              }
            : t
        )
      );
      setInputValue('');
      return;
    }

    // Up Arrow: Previous command in history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeTab.history.length === 0) return;
      const nextIndex = activeTab.historyIndex === -1 ? activeTab.history.length - 1 : Math.max(0, activeTab.historyIndex - 1);
      setInputValue(activeTab.history[nextIndex]);
      setTabs(prev =>
        prev.map(t => (t.id === activeTabId ? { ...t, historyIndex: nextIndex } : t))
      );
      return;
    }

    // Down Arrow: Next command in history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeTab.historyIndex === -1) return;
      const nextIndex = activeTab.historyIndex + 1;
      if (nextIndex >= activeTab.history.length) {
        setInputValue('');
        setTabs(prev =>
          prev.map(t => (t.id === activeTabId ? { ...t, historyIndex: -1 } : t))
        );
      } else {
        setInputValue(activeTab.history[nextIndex]);
        setTabs(prev =>
          prev.map(t => (t.id === activeTabId ? { ...t, historyIndex: nextIndex } : t))
        );
      }
      return;
    }

    // Tab: Autocomplete commands and files
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
      return;
    }
  };

  const handleTabComplete = () => {
    const tokens = inputValue.split(' ');
    const currentWord = tokens[tokens.length - 1];

    if (tokens.length === 1) {
      // Complete commands
      const commonCommands = [
        'ls', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'touch', 'rm', 'cp', 'mv',
        'neofetch', 'fastfetch', 'htop', 'cmatrix', 'sl', 'cowsay', 'fortune',
        'python3', 'nano', 'grep', 'find', 'tree', 'apt', 'clear', 'help'
      ];
      const matches = commonCommands.filter(c => c.startsWith(currentWord));
      if (matches.length === 1) {
        tokens[0] = matches[0];
        setInputValue(tokens.join(' ') + ' ');
      }
    } else {
      // Complete file/dir names in current working directory
      try {
        const files = virtualFS.listDir(activeTab.cwd);
        const matches = files.filter(f => f.name.startsWith(currentWord));
        if (matches.length === 1) {
          tokens[tokens.length - 1] = matches[0].name + (matches[0].type === 'dir' ? '/' : '');
          setInputValue(tokens.join(' '));
        }
      } catch {
        // ignore
      }
    }
  };

  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: TerminalTab = {
      id: newId,
      title: 'bash: ~',
      cwd: '/home/user',
      history: [],
      historyIndex: -1,
      lines: [
        {
          id: Math.random().toString(),
          type: 'info',
          text: 'New shell session created. Connected to local pseudo-tty.',
        },
      ],
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // Convert simple ANSI color escapes to formatted elements
  const formatAnsi = (text: string) => {
    if (!text.includes('\x1b[')) {
      return text;
    }

    // Simple parser for ANSI color codes
    const parts = text.split(/(\x1b\[[0-9;]*m)/g);
    let currentColorClass = '';
    const elements: React.ReactNode[] = [];

    parts.forEach((part, idx) => {
      if (part.startsWith('\x1b[')) {
        if (part === '\x1b[0m') {
          currentColorClass = '';
        } else if (part.includes('1;32m')) {
          currentColorClass = 'text-emerald-400 font-bold';
        } else if (part.includes('1;34m')) {
          currentColorClass = 'text-blue-400 font-bold';
        } else if (part.includes('1;33m')) {
          currentColorClass = 'text-amber-300 font-bold';
        } else if (part.includes('1;31m')) {
          currentColorClass = 'text-rose-400 font-bold';
        } else if (part.includes('1;35m')) {
          currentColorClass = 'text-fuchsia-400 font-bold';
        } else if (part.includes('1;36m')) {
          currentColorClass = 'text-cyan-400 font-bold';
        } else if (part.includes('40m')) {
          currentColorClass = 'bg-slate-800 text-slate-800 px-1';
        } else if (part.includes('41m')) {
          currentColorClass = 'bg-rose-500 text-rose-500 px-1';
        } else if (part.includes('42m')) {
          currentColorClass = 'bg-emerald-500 text-emerald-500 px-1';
        } else if (part.includes('43m')) {
          currentColorClass = 'bg-amber-500 text-amber-500 px-1';
        } else if (part.includes('44m')) {
          currentColorClass = 'bg-blue-500 text-blue-500 px-1';
        } else if (part.includes('45m')) {
          currentColorClass = 'bg-purple-500 text-purple-500 px-1';
        } else if (part.includes('46m')) {
          currentColorClass = 'bg-cyan-500 text-cyan-500 px-1';
        } else if (part.includes('47m')) {
          currentColorClass = 'bg-slate-200 text-slate-200 px-1';
        }
      } else if (part) {
        elements.push(
          <span key={idx} className={currentColorClass}>
            {part}
          </span>
        );
      }
    });

    return elements;
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-col h-full bg-[#0c1017] text-slate-200 terminal-font text-xs select-text overflow-hidden"
    >
      {/* Terminal Tabs & Quick Actions Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border-b border-slate-800 px-2 select-none">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs cursor-pointer border transition-colors ${
                tab.id === activeTabId
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 shadow-sm font-medium'
                  : 'bg-slate-950/40 text-slate-400 border-transparent hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[120px]">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={e => handleCloseTab(tab.id, e)}
                  className="p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleNewTab}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="New Terminal Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Command Pills */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] py-1 text-slate-400">
          <button
            onClick={() => handleRunCommand('neofetch')}
            className="px-2 py-0.5 rounded bg-slate-800/70 hover:bg-slate-700/90 text-cyan-300 border border-slate-700 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> neofetch
          </button>
          <button
            onClick={() => handleRunCommand('cmatrix')}
            className="px-2 py-0.5 rounded bg-slate-800/70 hover:bg-slate-700/90 text-emerald-300 border border-slate-700 transition-colors"
          >
            cmatrix
          </button>
          <button
            onClick={() => handleRunCommand('htop')}
            className="px-2 py-0.5 rounded bg-slate-800/70 hover:bg-slate-700/90 text-amber-300 border border-slate-700 transition-colors"
          >
            htop
          </button>
          <button
            onClick={() => handleRunCommand('sh /home/user/demo.sh')}
            className="px-2 py-0.5 rounded bg-slate-800/70 hover:bg-slate-700/90 text-sky-300 border border-slate-700 transition-colors flex items-center gap-1"
          >
            <Play className="w-2.5 h-2.5" /> demo.sh
          </button>
          <button
            onClick={() => handleRunCommand('help')}
            className="px-2 py-0.5 rounded bg-slate-800/70 hover:bg-slate-700/90 text-purple-300 border border-slate-700 transition-colors flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" /> help
          </button>
          <button
            onClick={() => handleRunCommand('clear')}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Clear terminal"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1 leading-relaxed">
        {activeTab.lines.map(line => {
          if (line.type === 'input') {
            return (
              <div key={line.id} className="flex items-start gap-2 pt-1 font-semibold">
                <span className="text-emerald-400 select-none whitespace-nowrap">
                  {line.promptCwd || shellEngine.getPrompt(activeTab.cwd)}
                </span>
                <span className="text-white">{line.text}</span>
              </div>
            );
          }

          let colorClass = 'text-slate-300';
          if (line.type === 'error') colorClass = 'text-rose-400';
          if (line.type === 'info') colorClass = 'text-cyan-400 font-medium';
          if (line.type === 'success') colorClass = 'text-emerald-400 font-medium';

          return (
            <div key={line.id} className={`whitespace-pre-wrap break-all ${colorClass}`}>
              {line.rawHtml ? formatAnsi(line.text) : line.text}
            </div>
          );
        })}

        {/* Active Input Line */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-emerald-400 font-semibold select-none whitespace-nowrap">
            {shellEngine.getPrompt(activeTab.cwd)}
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              className="w-full bg-transparent text-white outline-none border-none p-0 m-0 font-mono text-xs focus:ring-0"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            {isExecuting && (
              <span className="text-amber-400 animate-pulse text-[10px] ml-2">running...</span>
            )}
          </div>
        </div>

        <div ref={terminalBottomRef} />
      </div>
    </div>
  );
};
