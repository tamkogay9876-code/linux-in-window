import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Shield, RefreshCw, XCircle, Zap } from 'lucide-react';
import { ProcessItem } from '../../types';

export const SystemMonitor: React.FC = () => {
  const [cpuHistory, setCpuHistory] = useState<number[]>([15, 22, 18, 30, 25, 40, 32, 28, 45, 38, 26, 20]);
  const [activeTab, setActiveTab] = useState<'resources' | 'processes'>('resources');
  const [coreUsages, setCoreUsages] = useState<number[]>([24, 38, 18, 42]);
  const [processes, setProcesses] = useState<ProcessItem[]>([
    { pid: 1, user: 'root', priority: 20, nice: 0, virt: '168M', res: '12M', cpu: 0.1, mem: 0.2, time: '0:01.42', command: '/sbin/init splash' },
    { pid: 420, user: 'messagebus', priority: 20, nice: 0, virt: '84M', res: '6M', cpu: 0.0, mem: 0.1, time: '0:00.12', command: '/usr/bin/dbus-daemon --system' },
    { pid: 812, user: 'root', priority: 20, nice: 0, virt: '420M', res: '64M', cpu: 2.4, mem: 0.8, time: '0:05.18', command: '/usr/lib/xorg/Xorg -core :0' },
    { pid: 1042, user: 'user', priority: 20, nice: 0, virt: '850M', res: '142M', cpu: 5.1, mem: 1.8, time: '0:12.60', command: 'linux-in-window-compositor' },
    { pid: 1205, user: 'user', priority: 20, nice: 0, virt: '14M', res: '4M', cpu: 0.0, mem: 0.1, time: '0:00.25', command: '/bin/bash' },
    { pid: 1450, user: 'user', priority: 20, nice: 0, virt: '112M', res: '38M', cpu: 0.8, mem: 0.5, time: '0:01.05', command: 'pulseaudio --daemonize=no' },
    { pid: 1890, user: 'user', priority: 20, nice: 0, virt: '520M', res: '98M', cpu: 3.2, mem: 1.2, time: '0:04.30', command: 'node /home/user/Projects/server.js' },
    { pid: 2100, user: 'user', priority: 20, nice: 0, virt: '32M', res: '12M', cpu: 1.4, mem: 0.3, time: '0:00.45', command: 'python3 /home/user/calculator.py' },
  ]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate real fluctuating system activity
      const nextUsage = Math.floor(15 + Math.random() * 35);
      setCpuHistory(prev => [...prev.slice(1), nextUsage]);
      setCoreUsages([
        Math.floor(10 + Math.random() * 40),
        Math.floor(15 + Math.random() * 45),
        Math.floor(8 + Math.random() * 35),
        Math.floor(20 + Math.random() * 50),
      ]);
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const handleKillProcess = () => {
    if (!selectedPid) return;
    setProcesses(prev => prev.filter(p => p.pid !== selectedPid));
    setSelectedPid(null);
  };

  const currentCpuAvg = Math.round(coreUsages.reduce((a, b) => a + b, 0) / coreUsages.length);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none text-xs">
      {/* Tab Navigation */}
      <div className="h-10 px-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'resources'
                ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Resources & Graphs
          </button>
          <button
            onClick={() => setActiveTab('processes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'processes'
                ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Processes ({processes.length})
          </button>
        </div>

        {activeTab === 'processes' && selectedPid && (
          <button
            onClick={handleKillProcess}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium"
          >
            <XCircle className="w-3.5 h-3.5" /> End Process
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'resources' ? (
          <div className="space-y-4">
            {/* CPU History Graph */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold text-slate-100">CPU History (Overall: {currentCpuAvg}%)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">AMD Ryzen 9 7950X (4 vCPUs active)</span>
              </div>

              {/* Sparkline / Bar chart */}
              <div className="h-28 flex items-end gap-1.5 pt-2 border-b border-slate-800 px-1 bg-slate-900/40 rounded">
                {cpuHistory.map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      style={{ height: `${val}%` }}
                      className="w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-t transition-all duration-500 opacity-90"
                    />
                  </div>
                ))}
              </div>

              {/* Individual Core meters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {coreUsages.map((usage, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Core {idx + 1}</span>
                      <span className="font-mono text-slate-200">{usage}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${usage}%` }}
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory & Swap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-100">Memory (RAM)</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">2.74 GiB / 8.00 GiB (34%)</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div style={{ width: '34%' }} className="h-full bg-emerald-500 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>Available: <span className="text-slate-200 font-mono">5.26 GiB</span></div>
                  <div>Cached: <span className="text-slate-200 font-mono">608 MiB</span></div>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-slate-100">Virtual Root Disk (/)</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">34.5 GB / 250 GB (14%)</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                  <div style={{ width: '14%' }} className="h-full bg-sky-500 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>Type: <span className="text-slate-200 font-mono">ext4 (NVMe SSD)</span></div>
                  <div>Free space: <span className="text-slate-200 font-mono">215.5 GB</span></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/70">
            <div className="grid grid-cols-12 px-3 py-2 bg-slate-900 font-semibold text-slate-400 border-b border-slate-800 text-[11px]">
              <span className="col-span-2">PID</span>
              <span className="col-span-2">User</span>
              <span className="col-span-1">CPU%</span>
              <span className="col-span-1">MEM%</span>
              <span className="col-span-2">Res / Virt</span>
              <span className="col-span-4">Command</span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-[360px] overflow-y-auto">
              {processes.map(proc => {
                const isSelected = selectedPid === proc.pid;
                return (
                  <div
                    key={proc.pid}
                    onClick={() => setSelectedPid(proc.pid)}
                    className={`grid grid-cols-12 px-3 py-1.5 cursor-pointer font-mono text-[11px] items-center transition-colors ${
                      isSelected
                        ? 'bg-sky-600/30 text-white font-medium'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <span className="col-span-2">{proc.pid}</span>
                    <span className="col-span-2 text-slate-400">{proc.user}</span>
                    <span className="col-span-1 text-emerald-400">{proc.cpu.toFixed(1)}</span>
                    <span className="col-span-1 text-sky-400">{proc.mem.toFixed(1)}</span>
                    <span className="col-span-2 text-slate-400">{proc.res} / {proc.virt}</span>
                    <span className="col-span-4 truncate text-slate-200">{proc.command}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
