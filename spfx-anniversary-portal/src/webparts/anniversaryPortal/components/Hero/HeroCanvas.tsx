import * as React from 'react';

interface IParticle { x: number; y: number; vx: number; vy: number; r: number; s: number; c: string }
interface ISpark { x: number; y: number; vx: number; vy: number; l: number; c: string }

/** Confetti and fireworks over the hero. Loaded lazily and not at all under reduced motion. */
const HeroCanvas: React.FC<{ heroRef: React.RefObject<HTMLElement> }> = ({ heroRef }) => {
  const cv = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const H = heroRef.current, c = cv.current;
    if (!H || !c) return undefined;
    const x = c.getContext('2d');
    if (!x) return undefined;
    const col = ['#F58220', '#fff', '#D1D5DB', '#FFD9B3'];
    let W = 0, Hh = 0, mx = -999, my = -999, raf = 0;
    const cf: IParticle[] = [];
    let sp: ISpark[] = [];
    const rz = (): void => { W = c.width = H.offsetWidth; Hh = c.height = H.offsetHeight; };
    rz();
    const add = (px: number, py: number, vx: number, vy: number): void => {
      cf.push({ x: px, y: py, vx, vy, r: Math.random() * 6, s: 5 + Math.random() * 5, c: col[cf.length % 4] });
    };
    for (let i = 0; i < 70; i++) add(Math.random() * W, Math.random() * Hh, 0, 0.6 + Math.random());
    for (let i = 0; i < 110; i++) { const a = Math.random() * Math.PI; add(W / 2, Hh * 0.3, Math.cos(a) * (Math.random() * 9 - 4.5), -Math.random() * 9); }
    const move = (e: PointerEvent): void => {
      const b = H.getBoundingClientRect();
      mx = e.clientX - b.left; my = e.clientY - b.top;
      if (Math.random() < 0.25 && cf.length < 260) add(mx, my, Math.random() * 4 - 2, Math.random() * 2);
    };
    const fw = (): void => {
      if (document.hidden) return;
      const fx = W * (0.15 + Math.random() * 0.7), fy = Hh * (0.1 + Math.random() * 0.25), k = col[Math.floor(Math.random() * 4)];
      for (let j = 0; j < 36; j++) {
        const a = (j / 36) * 6.28;
        sp.push({ x: fx, y: fy, vx: Math.cos(a) * (1.5 + Math.random() * 1.5), vy: Math.sin(a) * (1.5 + Math.random() * 1.5), l: 1, c: k });
      }
    };
    const frame = (): void => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const r = H.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return; // off-screen: skip drawing
      x.clearRect(0, 0, W, Hh);
      for (let i = cf.length - 1; i >= 0; i--) {
        const p = cf[i];
        const dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110) { p.vx += (dx / d) * 0.6; p.vy += (dy / d) * 0.4; }
        p.vx *= 0.97; p.vy += 0.012; if (p.vy > 1.6) p.vy *= 0.97;
        p.x += p.vx + Math.sin(p.y / 40); p.y += p.vy; p.r += 0.06;
        if (p.y > Hh + 10) { if (cf.length > 180) { cf.splice(i, 1); continue; } p.y = -10; p.x = Math.random() * W; }
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.globalAlpha = 0.85;
        x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
      }
      sp = sp.filter(s => {
        s.x += s.vx; s.y += s.vy; s.vy += 0.04; s.vx *= 0.985; s.l -= 0.012;
        x.globalAlpha = Math.max(s.l, 0) * 0.8; x.fillStyle = s.c; x.fillRect(s.x, s.y, 2.5, 2.5);
        return s.l > 0;
      });
    };
    addEventListener('resize', rz); H.addEventListener('pointermove', move);
    const t = window.setInterval(fw, 3800);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); clearInterval(t); removeEventListener('resize', rz); H.removeEventListener('pointermove', move); };
  }, [heroRef]);
  return <canvas id="cv" ref={cv} aria-hidden="true" />;
};

export default HeroCanvas;
