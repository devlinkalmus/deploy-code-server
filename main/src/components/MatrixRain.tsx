import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  text?: string;
  showText?: boolean;
}

// Fullscreen canvas-based Matrix rain with charcoal-on-black palette
export default function MatrixRain({ text = 'jrvi', showText = true }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = mql.matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setupColumns();
    };

    // characters and drops
    const chars = 'アカサタナハマヤラワ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fontSize = 16; // small for dense rain
    let columns = 0;
    let drops: number[] = [];
    const setupColumns = () => {
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns)
        .fill(0)
        .map(() => Math.floor((Math.random() * canvas.height) / fontSize));
    };
    // initial sizing and columns/drops
    resize();
    window.addEventListener('resize', resize);
    const onMqlChange = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
      if (reduceMotion) {
        cancelAnimationFrame(raf);
        drawStatic();
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    mql.addEventListener('change', onMqlChange);

    // colors: black bg, charcoal rain
    const bgFill = 'rgba(0, 0, 0, 0.08)';
    const charColor = '#2b2b2b'; // charcoal

    let raf = 0;
    const draw = () => {
      if (reduceMotion) return;
      // subtle fade to create trail
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = charColor;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      raf = requestAnimationFrame(draw);
    };
    const drawStatic = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // optional: sprinkle a few faint chars for texture
      ctx.fillStyle = 'rgba(43,43,43,0.4)';
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < Math.min(50, columns); i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = Math.floor(Math.random() * columns) * fontSize;
        const y = Math.floor(Math.random() * Math.floor(canvas.height / fontSize)) * fontSize;
        ctx.fillText(char, x, y);
      }
    };
    // prime a dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (reduceMotion) {
      drawStatic();
    } else {
      draw();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      mql.removeEventListener('change', onMqlChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black pointer-events-none z-0">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center select-none">
          <span
            style={{
              color: '#3a3a3a', // dark grey
              letterSpacing: '0.3rem',
              fontFamily: 'monospace',
              textTransform: 'lowercase'
            }}
            className="text-5xl md:text-7xl"
          >
            {text}
          </span>
        </div>
      )}
    </div>
  );
}
