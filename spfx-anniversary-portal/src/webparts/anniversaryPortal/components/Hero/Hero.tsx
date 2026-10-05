import * as React from 'react';
import { usePortal, useText } from '../PortalContext';
import { useAudio } from '../AudioProvider';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const HeroCanvas = React.lazy(() => import(/* webpackChunkName: 'hero-canvas' */ './HeroCanvas'));

const CHIPS: { style: React.CSSProperties; b: string; t: string }[] = [
  { style: { left: '4%', top: '24%' }, b: '2006', t: 'Our doors open' },
  { style: { right: '4%', top: '30%' }, b: 'Growth', t: 'Branch network expands' },
  { style: { left: '6%', top: '52%' }, b: 'Digital', t: 'Banking goes mobile' },
  { style: { right: '6%', top: '56%' }, b: 'Impact', t: 'Millions of customers served' },
  { style: { left: '50%', top: '8%' }, b: 'People', t: '20 years of colleagues' }
];

export const Hero: React.FC = () => {
  const { assets } = usePortal();
  const t = useText();
  const audio = useAudio();
  const rm = useReducedMotion();
  const heroRef = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const vidRef = React.useRef<HTMLVideoElement>(null);
  const crewRef = React.useRef<HTMLDivElement>(null);

  // Mouse-follow glow + "hot" state (dancing speed in the original).
  React.useEffect(() => {
    const h = heroRef.current;
    if (!h) return undefined;
    const move = (e: PointerEvent): void => {
      const b = h.getBoundingClientRect();
      h.style.setProperty('--mx', ((e.clientX - b.left) / b.width) * 100 + '%');
      h.style.setProperty('--my', ((e.clientY - b.top) / b.height) * 100 + '%');
    };
    const on = (): void => h.classList.add('hot');
    const off = (): void => h.classList.remove('hot');
    h.addEventListener('pointermove', move); h.addEventListener('pointerenter', on); h.addEventListener('pointerleave', off);
    return () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerenter', on); h.removeEventListener('pointerleave', off); };
  }, []);

  // Hero video: poster first, fade in once frames play; pause off-screen / tab hidden; retry on first gesture.
  React.useEffect(() => {
    const v = vidRef.current, st = stageRef.current, h = heroRef.current;
    if (!v || !st || !h || rm || !assets.HeroVideo) return undefined;
    v.muted = true; v.defaultMuted = true;
    const vis = (): boolean => { const r = h.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    const go = (): void => { if (document.hidden || !vis()) return; const p = v.play(); if (p && p.catch) p.catch(() => undefined); };
    const show = (): void => st.classList.add('on');
    v.addEventListener('playing', show);
    v.addEventListener('canplay', go);
    if (!v.paused && v.readyState > 2) show();
    const gestures = ['pointerdown', 'touchstart', 'keydown', 'scroll'];
    gestures.forEach(e => addEventListener(e, go, { once: true, passive: true }));
    const vc = (): void => { if (document.hidden) v.pause(); else go(); };
    document.addEventListener('visibilitychange', vc);
    const io = new IntersectionObserver(es => {
      if (crewRef.current) crewRef.current.classList.toggle('off', !es[0].isIntersecting);
      if (es[0].isIntersecting) go(); else v.pause();
    });
    io.observe(h);
    go();
    return () => {
      v.removeEventListener('playing', show); v.removeEventListener('canplay', go);
      gestures.forEach(e => removeEventListener(e, go));
      document.removeEventListener('visibilitychange', vc); io.disconnect();
    };
  }, [rm, assets.HeroVideo]);

  // Floating "20" and music notes.
  React.useEffect(() => {
    if (rm) return undefined;
    const h = heroRef.current, c = crewRef.current;
    if (!h || !c) return undefined;
    const timers: number[] = [];
    const n20 = window.setInterval(() => {
      if (document.hidden) return;
      const n = document.createElement('span');
      n.className = 'n20'; n.textContent = '20'; n.setAttribute('aria-hidden', 'true');
      n.style.left = 5 + Math.random() * 90 + '%';
      h.appendChild(n);
      timers.push(window.setTimeout(() => n.remove(), 7000));
    }, 4500);
    const notes = window.setInterval(() => {
      if (document.hidden || c.classList.contains('off')) return;
      const n = document.createElement('span');
      n.className = 'nt'; n.textContent = ['♪', '♫', '♬'][Math.floor(Math.random() * 3)];
      n.style.setProperty('--dx', Math.random() * 80 - 40 + 'px');
      n.style.left = 15 + Math.random() * 70 + '%';
      c.appendChild(n);
      timers.push(window.setTimeout(() => n.remove(), 3000));
    }, 900);
    return () => { clearInterval(n20); clearInterval(notes); timers.forEach(clearTimeout); };
  }, [rm]);

  const showVideo = !rm && !!assets.HeroVideo;
  return (
    <header className="hero" id="hero" ref={heroRef}>
      <div className="hbg" aria-hidden="true" />
      {assets.HeroPoster ? (
        <div className="hst hpo" aria-hidden="true">
          <img src={assets.HeroPoster} alt="" width={720} height={406} decoding="async" />
        </div>
      ) : null}
      <div className="glow" aria-hidden="true" />
      <svg className="rib" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-50 120C200 40 350 220 600 130S1000 40 1260 140" stroke="#fff" />
        <path d="M-50 300C250 380 420 200 700 300S1050 400 1260 280" stroke="#D1D5DB" />
        <path d="M-50 460C200 400 450 520 700 440S1050 380 1260 470" stroke="#F58220" />
      </svg>
      <div className="chips" aria-hidden="true">
        {CHIPS.map((c, i) => <span key={i} style={c.style}><b>{c.b}</b>{c.t}</span>)}
      </div>
      {!rm ? <React.Suspense fallback={null}><HeroCanvas heroRef={heroRef} /></React.Suspense> : null}
      <div className="lg">
        <div className="burst" aria-hidden="true" />
        {assets.Logo ? <img className="logo2" src={assets.Logo} alt="20th anniversary logo" width={328} height={241} /> : null}
      </div>
      <div className="hc">
        <h1>{t('hero.title')}</h1>
        <p>{t('hero.subtitle')}</p>
        <div className="ctas">
          <a className="btn b1" href="#tree" onClick={e => jump(e, 'tree')}>{t('hero.btn1')}</a>
          <a className="btn b2" href="#journey" onClick={e => jump(e, 'journey')}>{t('hero.btn2')}</a>
          <a className="btn b2" href="#video" onClick={e => jump(e, 'video')}>{t('hero.btn3')}</a>
        </div>
      </div>
      {showVideo ? (
        <div className="hst hvd" ref={stageRef} aria-hidden="true">
          <video ref={vidRef} autoPlay muted loop playsInline preload="auto" tabIndex={-1} disablePictureInPicture
            src={assets.HeroVideo} />
        </div>
      ) : null}
      <div className="hshade" aria-hidden="true" />
      <div className="crew" ref={crewRef} aria-hidden="true" />
      {audio.available ? (
        <div className="aud" role="group" aria-label="Background music">
          <button type="button" aria-pressed={audio.playing} onClick={audio.toggle}
            className={!audio.playing && audio.want ? 'ask' : undefined}>
            {audio.playing ? 'Sound on' : 'Sound off'}
          </button>
          <label>Volume <input type="range" min={0} max={100} value={audio.volume} aria-label="Music volume"
            onChange={e => audio.setVolume(+e.target.value)} /></label>
        </div>
      ) : null}
    </header>
  );
};

/** In-page anchor jump that works inside the SharePoint page (no hash navigation). */
function jump(e: React.MouseEvent, id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const rm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' });
}
