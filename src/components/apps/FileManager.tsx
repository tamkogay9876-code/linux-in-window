import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Home,
  HardDrive,
  Download,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  Terminal,
  FileCode,
  FolderPlus,
  ChevronRight,
  ArrowUp,
  LayoutGrid,
  List
} from 'lucide-react';
import { FSNode } from '../../types';
import { virtualFS } from '../../services/virtualFs';

interface FileManagerProps {
  openApp: (appType: any, data?: any) => void;
  initialPath?: string;
}

export const FileManager: React.FC<FileManagerProps> = ({ openApp, initialPath = '/home/user' }) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [items, setItems] = useState<FSNode[]>([]);
  const [selectedItem, setSelectedItem] = useState<FSNode | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newDialogType, setNewDialogType] = useState<'file' | 'folder' | null>(null);
  const [newDialogName, setNewDialogName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDirectory = (path: string) => {
    try {
      setErrorMsg(null);
      const list = virtualFS.listDir(path);
      setItems(list);
      setCurrentPath(path);
      setSelectedItem(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const handleNavigate = (targetPath: string) => {
    loadDirectory(targetPath);
  };

  const handleNavigateUp = () => {
    const parent = virtualFS.getParentPath(currentPath);
    handleNavigate(parent);
  };

  const handleItemDoubleClick = (item: FSNode) => {
    if (item.type === 'dir') {
      handleNavigate(item.path);
    } else if (item.isExecutable) {
      openApp('terminal', { initialCommand: item.path });
    } else {
      openApp('text-editor', { filePath: item.path });
    }
  };

  const handleCreateConfirm = () => {
    if (!newDialogName.trim()) {
      setNewDialogType(null);
      return;
    }
    const fullPath = virtualFS.resolvePath(currentPath, newDialogName.trim());
    try {
      if (newDialogType === 'folder') {
        virtualFS.makeDir(fullPath);
      } else {
        virtualFS.writeFile(fullPath, '');
      }
      setNewDialogType(null);
      setNewDialogName('');
      loadDirectory(currentPath);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedItem) return;
    try {
      virtualFS.remove(selectedItem.path, true);
      loadDirectory(currentPath);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const targetPath = virtualFS.resolvePath(currentPath, file.name);
      virtualFS.writeFile(targetPath, content || '');
      loadDirectory(currentPath);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadSelected = () => {
    if (!selectedItem || selectedItem.type === 'dir') return;
    try {
      const content = virtualFS.readFile(selectedItem.path);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedItem.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  // Breadcrumbs builder
  const pathParts = currentPath.split('/').filter(Boolean);

  const getFileIcon = (item: FSNode) => {
    if (item.type === 'dir') {
      return <Folder className="w-8 h-8 text-amber-400 fill-amber-400/20" />;
    }
    if (item.name.endsWith('.py') || item.name.endsWith('.js') || item.name.endsWith('.sh')) {
      return <FileCode className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />;
    }
    return <FileText className="w-8 h-8 text-sky-400 fill-sky-400/20" />;
  };

  return (
    <div className="flex h-full bg-slate-900 text-slate-200 select-none text-xs">
      {/* Sidebar Places */}
      <div className="w-44 bg-slate-950/80 border-r border-slate-800 p-2 flex flex-col gap-1">
        <span className="text-[10px] font-semibold text-slate-400 px-2 py-1 tracking-wider uppercase">
          Places
        </span>
        <button
          onClick={() => handleNavigate('/home/user')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/home/user' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-blue-400" />
          <span>Home</span>
        </button>
        <button
          onClick={() => handleNavigate('/home/user/Desktop')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/home/user/Desktop' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span>Desktop</span>
        </button>
        <button
          onClick={() => handleNavigate('/home/user/Documents')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/home/user/Documents' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          <span>Documents</span>
        </button>
        <button
          onClick={() => handleNavigate('/home/user/Downloads')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/home/user/Downloads' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Downloads</span>
        </button>
        <button
          onClick={() => handleNavigate('/home/user/Projects')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/home/user/Projects' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-purple-400" />
          <span>Projects</span>
        </button>

        <span className="text-[10px] font-semibold text-slate-400 px-2 py-1 mt-3 tracking-wider uppercase">
          Linux Root
        </span>
        <button
          onClick={() => handleNavigate('/')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-rose-400" />
          <span>Filesystem /</span>
        </button>
        <button
          onClick={() => handleNavigate('/etc')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/etc' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-slate-400" />
          <span>/etc</span>
        </button>
        <button
          onClick={() => handleNavigate('/bin')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/bin' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-slate-400" />
          <span>/bin</span>
        </button>
        <button
          onClick={() => handleNavigate('/var/log')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors ${
            currentPath === '/var/log' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-slate-400" />
          <span>/var/log</span>
        </button>
      </div>

      {/* Main File Explorer Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation & Action Bar */}
        <div className="h-10 px-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 gap-2">
          {/* Back/Up & Breadcrumbs */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
            <button
              onClick={handleNavigateUp}
              disabled={currentPath === '/'}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Parent directory"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {/* Clickable Breadcrumbs */}
            <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2 py-1 rounded text-xs">
              <button
                onClick={() => handleNavigate('/')}
                className="hover:text-sky-400 font-mono text-slate-300"
              >
                /
              </button>
              {pathParts.map((part, idx) => {
                const stepPath = '/' + pathParts.slice(0, idx + 1).join('/');
                return (
                  <React.Fragment key={stepPath}>
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                    <button
                      onClick={() => handleNavigate(stepPath)}
                      className={`hover:text-sky-400 truncate max-w-[100px] ${
                        idx === pathParts.length - 1 ? 'text-sky-400 font-medium' : 'text-slate-300'
                      }`}
                    >
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setNewDialogType('file'); setNewDialogName(''); }}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="New File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setNewDialogType('folder'); setNewDialogName(''); }}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <label className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer" title="Upload File to Linux">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" onChange={handleUploadFile} className="hidden" />
            </label>
            {selectedItem && selectedItem.type === 'file' && (
              <button
                onClick={handleDownloadSelected}
                className="p-1.5 rounded hover:bg-slate-800 text-emerald-400"
                title="Download selected file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            {selectedItem && (
              <button
                onClick={handleDeleteSelected}
                className="p-1.5 rounded hover:bg-slate-800 text-rose-400"
                title="Delete selected item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => openApp('terminal', { initialCommand: `cd ${currentPath}` })}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-400"
              title="Open Terminal Here"
            >
              <Terminal className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Toggle View Mode"
            >
              {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => loadDirectory(currentPath)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="bg-rose-500/20 text-rose-300 px-3 py-1.5 text-[11px] border-b border-rose-500/30 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-bold">×</button>
          </div>
        )}

        {/* New Item Modal Popup */}
        {newDialogType && (
          <div className="bg-slate-800/90 border-b border-slate-700 px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-slate-300">
              Create {newDialogType === 'folder' ? 'Folder' : 'File'}:
            </span>
            <input
              type="text"
              placeholder={newDialogType === 'folder' ? 'new_folder' : 'document.txt'}
              value={newDialogName}
              onChange={e => setNewDialogName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateConfirm(); if (e.key === 'Escape') setNewDialogType(null); }}
              autoFocus
              className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-xs text-white focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleCreateConfirm}
              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium"
            >
              Create
            </button>
            <button
              onClick={() => setNewDialogType(null)}
              className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* File List/Grid Content */}
        <div className="flex-1 p-3 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <Folder className="w-12 h-12 stroke-[1.2] text-slate-600 mb-2" />
              <span>Directory is empty</span>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map(item => {
                const isSelected = selectedItem?.path === item.path;
                return (
                  <div
                    key={item.path}
                    onClick={() => setSelectedItem(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`flex flex-col items-center p-3 rounded-lg cursor-pointer border transition-all text-center group ${
                      isSelected
                        ? 'bg-sky-600/25 border-sky-500/50 shadow-md ring-1 ring-sky-400/30'
                        : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="mb-2 transition-transform group-hover:scale-105">
                      {getFileIcon(item)}
                    </div>
                    <span className="truncate w-full text-xs font-medium text-slate-200">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {item.type === 'dir' ? 'Folder' : `${(item.size / 1024).toFixed(1)} KB`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              <div className="grid grid-cols-12 text-[11px] text-slate-400 font-semibold px-2 py-1 bg-slate-950/40">
                <span className="col-span-6">Name</span>
                <span className="col-span-2">Size</span>
                <span className="col-span-2">Permissions</span>
                <span className="col-span-2">Modified</span>
              </div>
              {items.map(item => {
                const isSelected = selectedItem?.path === item.path;
                return (
                  <div
                    key={item.path}
                    onClick={() => setSelectedItem(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`grid grid-cols-12 items-center px-2 py-1.5 cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-sky-600/30 text-white' : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <div className="col-span-6 flex items-center gap-2 truncate">
                      {item.type === 'dir' ? (
                        <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      )}
                      <span className="truncate font-medium">{item.name}</span>
                    </div>
                    <span className="col-span-2 text-slate-400">
                      {item.type === 'dir' ? '-' : `${item.size} B`}
                    </span>
                    <span className="col-span-2 font-mono text-slate-400 text-[11px]">
                      {item.permissions}
                    </span>
                    <span className="col-span-2 text-slate-400 text-[11px]">
                      {new Date(item.modified).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-6 px-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>{items.length} items</span>
          <span>{selectedItem ? `${selectedItem.name} (${selectedItem.permissions})` : currentPath}</span>
        </div>
      </div>
    </div>
  );
};
