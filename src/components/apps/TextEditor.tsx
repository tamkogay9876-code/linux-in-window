import React, { useState, useEffect } from 'react';
import { Save, Play, FileCode, CheckCircle2, RotateCcw } from 'lucide-react';
import { virtualFS } from '../../services/virtualFs';

interface TextEditorProps {
  filePath?: string;
  openApp: (appType: any, data?: any) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({ filePath = '/home/user/welcome.txt', openApp }) => {
  const [currentFile, setCurrentFile] = useState<string>(filePath);
  const [content, setContent] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (virtualFS.exists(currentFile)) {
        const text = virtualFS.readFile(currentFile);
        setContent(text);
        setIsSaved(true);
      } else {
        setContent('');
        setIsSaved(true);
      }
    } catch {
      setContent('');
    }
  }, [currentFile]);

  const handleSave = () => {
    try {
      virtualFS.writeFile(currentFile, content);
      setIsSaved(true);
      setSaveStatusText('Saved to virtual filesystem!');
      setTimeout(() => setSaveStatusText(null), 2500);
    } catch (e: any) {
      setSaveStatusText(`Error: ${e.message}`);
    }
  };

  const handleRunInTerminal = () => {
    handleSave();
    if (currentFile.endsWith('.py')) {
      openApp('terminal', { initialCommand: `python3 ${currentFile}` });
    } else if (currentFile.endsWith('.sh')) {
      openApp('terminal', { initialCommand: `bash ${currentFile}` });
    } else {
      openApp('terminal', { initialCommand: `cat ${currentFile}` });
    }
  };

  const lineCount = content.split('\n').length;
  const isExecutable = currentFile.endsWith('.sh') || currentFile.endsWith('.py');

  return (
    <div className="flex flex-col h-full bg-[#181a1f] text-slate-200 select-text text-xs">
      {/* Editor Menu Bar */}
      <div className="h-10 px-3 bg-[#21252b] border-b border-slate-700/60 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-sky-400" />
          <input
            type="text"
            value={currentFile}
            onChange={e => setCurrentFile(e.target.value)}
            className="bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 w-56"
            title="File Path"
          />
          {!isSaved && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveStatusText && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {saveStatusText}
            </span>
          )}
          {isExecutable && (
            <button
              onClick={handleRunInTerminal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium text-xs transition-colors"
            >
              <Play className="w-3 h-3" /> Run
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers gutter */}
        <div className="w-10 bg-[#1e2227] text-slate-600 text-right pr-2 py-3 select-none font-mono text-xs border-r border-slate-800 leading-5">
          {Array.from({ length: Math.max(lineCount, 15) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={e => {
            setContent(e.target.value);
            setIsSaved(false);
          }}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleSave();
            }
          }}
          spellCheck={false}
          className="flex-1 bg-transparent text-slate-100 p-3 font-mono text-xs leading-5 resize-none outline-none border-none overflow-y-auto whitespace-pre tab-4"
          placeholder="Type or paste content here..."
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 px-3 bg-[#21252b] border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-4">
          <span>Lines: {lineCount}</span>
          <span>Characters: {content.length}</span>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <span>UTF-8</span>
          <span>{currentFile.split('.').pop()?.toUpperCase() || 'TXT'}</span>
          <span>Linux (LF)</span>
        </div>
      </div>
    </div>
  );
};
