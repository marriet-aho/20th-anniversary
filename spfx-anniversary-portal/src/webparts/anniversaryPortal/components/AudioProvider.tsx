import * as React from 'react';

interface IAudioApi {
  available: boolean;
  playing: boolean;
  want: boolean;
  volume: number;
  toggle: () => void;
  setVolume: (v: number) => void;
  hold: () => void;     // a video started: pause music
  release: () => void;  // the video stopped: resume only if music was playing and not turned off
}

const Ctx = React.createContext<IAudioApi | undefined>(undefined);
export const useAudio = (): IAudioApi => {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('AudioProvider missing');
  return c;
};

export const AudioProvider: React.FC<{ src?: string; children: React.ReactNode }> = ({ src, children }) => {
  const el = React.useRef<HTMLAudioElement>();
  const want = React.useRef(true);   // visitor has not turned music off
  const held = React.useRef(false);
  const [playing, setPlaying] = React.useState(false);
  const [volume, setVol] = React.useState(25);
  const [wantState, setWantState] = React.useState(true);

  const go = React.useCallback((): void => {
    const a = el.current;
    if (!a || !src) return;
    const p = a.play();
    if (p && p.catch) p.catch(() => setPlaying(false));
  }, [src]);

  React.useEffect(() => {
    if (!src) return undefined;
    const a = new Audio();
    a.loop = true; a.volume = 0.25; a.preload = 'auto'; a.src = src;
    a.onplay = () => setPlaying(true);
    a.onpause = () => setPlaying(false);
    el.current = a;
    go(); // may be blocked until the first gesture
    const first = (e: Event): void => {
      const t = e.target as Element | null;
      if (t && t.closest && t.closest('.aud')) return;
      ['pointerdown', 'keydown', 'touchstart'].forEach(ev => removeEventListener(ev, first, true));
      if (want.current && a.paused && !held.current) go();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, first, true));
    const off = (): void => a.pause();
    addEventListener('pagehide', off);
    return () => {
      ['pointerdown', 'keydown', 'touchstart'].forEach(ev => removeEventListener(ev, first, true));
      removeEventListener('pagehide', off);
      a.pause(); a.src = ''; el.current = undefined;
    };
  }, [src, go]);

  const api: IAudioApi = {
    available: !!src, playing, want: wantState, volume,
    toggle: () => {
      const a = el.current;
      if (!a) return;
      if (a.paused) { want.current = true; setWantState(true); go(); } else { want.current = false; setWantState(false); a.pause(); }
    },
    setVolume: v => { setVol(v); if (el.current) el.current.volume = v / 100; },
    hold: () => { const a = el.current; if (a && !a.paused) { a.pause(); held.current = true; } },
    release: () => { if (held.current) { held.current = false; if (want.current) go(); } }
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};
