import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Palette, Gauge } from 'lucide-react';

export const CMatrixVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [colorTheme, setColorTheme] = useState<'green' | 'cyan' | 'purple' | 'amber'>('green');
  const [speed, setSpeed] = useState<number>(33);

  const colors = {
    green: { head: '#ffffff', trail: '#22c55e', dim: '#15803d' },
    cyan: { head: '#ffffff', trail: '#38bdf8', dim: '#0369a1' },
    purple: { head: '#ffffff', trail: '#c084fc', dim: '#7e22ce' },
    amber: { head: '#ffffff', trail: '#fbbf24', dim: '#b45309' },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 400;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const characters = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ1234567890ABCDEF@#$%&*';
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array.from({ length: columns }).map(() => Math.floor(Math.random() * -50));

    let lastDraw = 0;
    const draw = (timestamp: number) => {
      if (timestamp - lastDraw > speed) {
        lastDraw = timestamp;

        ctx.fillStyle = 'rgba(10, 15, 20, 0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${fontSize}px monospace`;
        const activeTheme = colors[colorTheme];

        for (let i = 0; i < drops.length; i++) {
          const char = characters.charAt(Math.floor(Math.random() * characters.length));
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          // Head character is glowing white/bright
          ctx.fillStyle = activeTheme.head;
          ctx.fillText(char, x, y);

          // Trail characters
          ctx.fillStyle = activeTheme.trail;
          ctx.fillText(char, x, y - fontSize);

          if (y > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }

      if (isRunning) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    if (isRunning) {
      animationFrameId = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isRunning, colorTheme, speed]);

  return (
    <div className="flex flex-col h-full bg-black text-slate-200 select-none overflow-hidden relative">
      {/* Controls Bar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded border border-slate-700/60 text-xs">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
          title={isRunning ? 'Pause' : 'Resume'}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        <div className="flex items-center gap-1 ml-1">
          <Palette className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setColorTheme('green')}
            className={`w-3.5 h-3.5 rounded-full bg-emerald-500 ring-1 ${colorTheme === 'green' ? 'ring-white' : 'ring-transparent'}`}
          />
          <button
            onClick={() => setColorTheme('cyan')}
            className={`w-3.5 h-3.5 rounded-full bg-sky-400 ring-1 ${colorTheme === 'cyan' ? 'ring-white' : 'ring-transparent'}`}
          />
          <button
            onClick={() => setColorTheme('purple')}
            className={`w-3.5 h-3.5 rounded-full bg-purple-500 ring-1 ${colorTheme === 'purple' ? 'ring-white' : 'ring-transparent'}`}
          />
          <button
            onClick={() => setColorTheme('amber')}
            className={`w-3.5 h-3.5 rounded-full bg-amber-400 ring-1 ${colorTheme === 'amber' ? 'ring-white' : 'ring-transparent'}`}
          />
        </div>

        <div className="flex items-center gap-1 ml-2 text-[11px] text-slate-400">
          <Gauge className="w-3 h-3" />
          <button
            onClick={() => setSpeed(prev => (prev === 20 ? 45 : prev === 45 ? 70 : 20))}
            className="hover:text-white font-mono"
          >
            {speed === 20 ? 'Fast' : speed === 45 ? 'Norm' : 'Slow'}
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="flex-1 w-full h-full block" />
    </div>
  );
};
