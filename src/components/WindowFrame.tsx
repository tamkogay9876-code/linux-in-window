import React, { useState, useRef, useEffect } from 'react';
import { Minus, Square, Copy, X, Terminal, Folder, FileText, Activity, ShoppingBag, Settings, Code, Sparkles, Monitor } from 'lucide-react';
import { WindowItem, DistroTheme } from '../types';
import { DISTROS } from '../services/distroConfig';

interface WindowFrameProps {
  window: WindowItem;
  isActive: boolean;
  distro: DistroTheme;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onUpdateBounds: (id: string, bounds: { position?: { x: number; y: number }; size?: { width: number; height: number } }) => void;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  window: win,
  isActive,
  distro,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onUpdateBounds,
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const [initialResize, setInitialResize] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  const windowRef = useRef<HTMLDivElement>(null);
  const currentDistro = DISTROS[distro] || DISTROS.ubuntu;

  // Handle Dragging
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (win.isMaximized) return;
    if ((e.target as HTMLElement).closest('.window-control-btn')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - win.position.x,
      y: e.clientY - win.position.y,
    });
    onFocus();
  };

  // Handle Resizing
  const handleMouseDownResize = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    if (win.isMaximized) return;
    setIsResizing(true);
    setResizeDirection(direction);
    setInitialResize({
      x: e.clientX,
      y: e.clientY,
      width: win.size.width,
      height: win.size.height,
      posX: win.position.x,
      posY: win.position.y,
    });
    onFocus();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !win.isMaximized) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.y));
        onUpdateBounds(win.id, { position: { x: newX, y: newY } });
      } else if (isResizing && !win.isMaximized) {
        const deltaX = e.clientX - initialResize.x;
        const deltaY = e.clientY - initialResize.y;
        let newWidth = initialResize.width;
        let newHeight = initialResize.height;
        let newX = initialResize.posX;
        let newY = initialResize.posY;

        if (resizeDirection.includes('e')) {
          newWidth = Math.max(360, initialResize.width + deltaX);
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(260, initialResize.height + deltaY);
        }
        if (resizeDirection.includes('w')) {
          const possibleWidth = initialResize.width - deltaX;
          if (possibleWidth >= 360) {
            newWidth = possibleWidth;
            newX = initialResize.posX + deltaX;
          }
        }
        if (resizeDirection.includes('n')) {
          const possibleHeight = initialResize.height - deltaY;
          if (possibleHeight >= 260) {
            newHeight = possibleHeight;
            newY = initialResize.posY + deltaY;
          }
        }

        onUpdateBounds(win.id, {
          position: { x: newX, y: newY },
          size: { width: newWidth, height: newHeight },
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, initialResize, resizeDirection, win.id, win.isMaximized, onUpdateBounds]);

  if (win.isMinimized) {
    return null;
  }

  const getAppIcon = () => {
    switch (win.appType) {
      case 'terminal': return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'file-manager': return <Folder className="w-4 h-4 text-amber-400" />;
      case 'text-editor': return <FileText className="w-4 h-4 text-sky-400" />;
      case 'sysmon': return <Activity className="w-4 h-4 text-rose-400" />;
      case 'store': return <ShoppingBag className="w-4 h-4 text-violet-400" />;
      case 'settings': return <Settings className="w-4 h-4 text-slate-300" />;
      case 'cmatrix': return <Sparkles className="w-4 h-4 text-green-400" />;
      case 'python': return <Code className="w-4 h-4 text-yellow-400" />;
      default: return <Monitor className="w-4 h-4 text-slate-400" />;
    }
  };

  const style: React.CSSProperties = win.isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100% - 48px)', // taskbar height
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        left: `${win.position.x}px`,
        top: `${win.position.y}px`,
        width: `${win.size.width}px`,
        height: `${win.size.height}px`,
        zIndex: win.zIndex,
      };

  return (
    <div
      ref={windowRef}
      style={style}
      onMouseDown={onFocus}
      className={`flex flex-col bg-slate-900/95 backdrop-blur-md rounded-lg overflow-hidden border transition-shadow duration-150 ${
        isActive
          ? 'shadow-2xl shadow-black/60 border-slate-700/80 ring-1 ring-white/10'
          : 'shadow-lg shadow-black/40 border-slate-800/60 opacity-95'
      }`}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDownHeader}
        onDoubleClick={onToggleMaximize}
        className={`h-9 px-3 flex items-center justify-between select-none cursor-move border-b border-slate-800/70 ${
          isActive ? 'bg-slate-800/90 text-slate-100' : 'bg-slate-900/90 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
          {getAppIcon()}
          <span className="text-xs font-medium truncate tracking-wide">{win.title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${currentDistro.badgeBg}`}>
            {currentDistro.name.split(' ')[0]}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
            className="window-control-btn w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-100 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMaximize(); }}
            className="window-control-btn w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-100 transition-colors"
            title={win.isMaximized ? "Restore" : "Maximize"}
          >
            {win.isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="window-control-btn w-6 h-6 flex items-center justify-center rounded hover:bg-red-500 hover:text-white text-slate-400 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 relative overflow-hidden bg-slate-950/80">
        {children}
      </div>

      {/* Resizers (only when not maximized) */}
      {!win.isMaximized && (
        <>
          <div onMouseDown={(e) => handleMouseDownResize(e, 'e')} className="absolute top-0 right-0 w-1.5 h-full cursor-e-resize" />
          <div onMouseDown={(e) => handleMouseDownResize(e, 's')} className="absolute bottom-0 left-0 w-full h-1.5 cursor-s-resize" />
          <div onMouseDown={(e) => handleMouseDownResize(e, 'w')} className="absolute top-0 left-0 w-1.5 h-full cursor-w-resize" />
          <div onMouseDown={(e) => handleMouseDownResize(e, 'n')} className="absolute top-0 left-0 w-full h-1.5 cursor-n-resize" />
          <div onMouseDown={(e) => handleMouseDownResize(e, 'se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" />
          <div onMouseDown={(e) => handleMouseDownResize(e, 'sw')} className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" />
          <div onMouseDown={(e) => handleMouseDownResize(e, 'ne')} className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" />
          <div onMouseDown={(e) => handleMouseDownResize(e, 'nw')} className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" />
        </>
      )}
    </div>
  );
};
