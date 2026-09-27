import React, { useState } from 'react';
import { Play, RotateCcw, Code, Terminal, BookOpen } from 'lucide-react';
import { shellEngine } from '../../services/shellEngine';

const TEMPLATES: Record<string, string> = {
  math: `# Math & Statistics in Python
numbers = [14, 28, 42, 56, 70, 84, 98]
total = sum(numbers)
avg = total / len(numbers)

print("List:", numbers)
print("Count:", len(numbers))
print("Sum:", total)
print("Average:", avg)
print("Min:", min(numbers))
print("Max:", max(numbers))
`,
  fib: `# Fibonacci Generator
def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

fib10 = fibonacci(10)
print("First 10 Fibonacci numbers:")
print(fib10)
`,
  strings: `# String Processing
message = "Linux in Window is Powerful!"
words = message.split()

print("Original:", message)
print("Uppercase:", message.upper())
print("Reversed:", message[::-1])
print("Word count:", len(words))
for w in words:
    print(f" -> {w} ({len(w)} chars)")
`,
};

export const PythonWorkspace: React.FC = () => {
  const [code, setCode] = useState<string>(TEMPLATES.math);
  const [output, setOutput] = useState<string[]>([
    'Python 3.12.3 interactive environment initialized.',
    'Select a sample template or write code and click Run.',
  ]);

  const handleRun = () => {
    const res = shellEngine.executeSimulatedPython(code);
    setOutput(res);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e] text-slate-200 select-text text-xs">
      {/* Top Bar */}
      <div className="h-10 px-3 bg-[#181825] border-b border-slate-700/60 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-yellow-400" />
          <span className="font-semibold text-slate-100">Python 3.12 Interactive Sandbox</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Templates:</span>
          <button
            onClick={() => setCode(TEMPLATES.math)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Math
          </button>
          <button
            onClick={() => setCode(TEMPLATES.fib)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Fibonacci
          </button>
          <button
            onClick={() => setCode(TEMPLATES.strings)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Strings
          </button>

          <button
            onClick={handleRun}
            className="flex items-center gap-1 px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-semibold transition-colors ml-2 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" /> Run Code
          </button>
        </div>
      </div>

      {/* Editor & Output Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Code Input */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-700/60">
          <div className="px-3 py-1 bg-[#11111b] text-slate-400 text-[11px] font-mono border-b border-slate-800 flex justify-between select-none">
            <span>script.py</span>
            <span>Python 3 syntax</span>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-yellow-100 font-mono text-xs resize-none outline-none leading-5"
          />
        </div>

        {/* Output Console */}
        <div className="flex-1 flex flex-col bg-[#11111b]">
          <div className="px-3 py-1 bg-[#181825] text-slate-400 text-[11px] font-mono border-b border-slate-800 flex justify-between items-center select-none">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Terminal className="w-3 h-3" /> Console Output
            </span>
            <button
              onClick={() => setOutput([])}
              className="hover:text-slate-200 p-0.5"
              title="Clear output"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1">
            {output.map((line, idx) => (
              <div key={idx} className="text-slate-300 whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
