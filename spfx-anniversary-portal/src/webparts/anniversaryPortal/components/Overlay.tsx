import * as React from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

let shown = false; // once per page load (kept in memory, not browser storage)
const COLORS = ['#fff', '#F58220', '#D1D5DB'];

export const EntryOverlay: React.FC = () => {
  const rm = useReducedMotion();
  const [open, setOpen] = React.useState(!shown);
  const [out, setOut] = React.useState(false);
  const btn = React.useRef<HTMLButtonElement>(null);
  const ac = React.useRef<AudioContext>();
  const confetti = React.useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 1.5, bg: COLORS[i % 3]
  })), []);

  const close = React.useCallback((): void => {
    setOut(true);
    window.setTimeout(() => setOpen(false), 900);
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    shown = true;
    if (btn.current) btn.current.focus();
    const t = window.setTimeout(close, 8000);
    const k = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k);
    return () => { clearTimeout(t); document.removeEventListener('keydown', k); };
  }, [open, close]);

  const chime = (): void => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = ac.current = ac.current || new AC();
    [523, 659, 784, 1047].forEach((f, i) => {
      const n = ctx.currentTime + i * 0.15, os = ctx.createOscillator(), g = ctx.createGain();
      os.frequency.value = f;
      g.gain.setValueAtTime(0.15, n); g.gain.exponentialRampToValueAtTime(0.001, n + 0.9);
      os.connect(g); g.connect(ctx.destination); os.start(n); os.stop(n + 1);
    });
  };

  if (!open) return null;
  return (
    <div id="ov" className={out ? 'out' : undefined} role="dialog" aria-modal="true" aria-labelledby="ovt">
      <span className="rg" style={{ left: '20%', top: '30%' }} />
      <span className="rg" style={{ left: '75%', top: '22%', animationDelay: '.8s' }} />
      <span className="rg" style={{ left: '50%', top: '70%', animationDelay: '1.5s' }} />
      {!rm ? confetti.map((c, i) => (
        <i key={i} className="conf" aria-hidden="true" style={{ left: c.left + '%', animationDelay: c.delay + 's', background: c.bg }} />
      )) : null}
      <div className="ob">
        <div className="b20" aria-hidden="true">20</div>
        <h2 id="ovt">Welcome to Our 20th Anniversary Celebration</h2>
        <p>Join us as we celebrate 20 years of excellence and the people who made it possible.</p>
        <button type="button" className="btn" ref={btn} onClick={close}>Enter the celebration</button>{' '}
        <button type="button" className="btn g2" onClick={chime}>Play celebration sound</button>
      </div>
    </div>
  );
};
