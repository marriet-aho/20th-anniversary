import * as React from 'react';
import { IBoardMessage } from '../../models';
import { tagLabel } from '../../logic/tagSuggest';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const Who: React.FC<{ m: IBoardMessage }> = ({ m }) => (
  <div className="oc-ft"><b>{m.authorName || 'A colleague'}</b>{m.celebratingName ? <> celebrating <i>{m.celebratingName}</i></> : null}</div>
);

export const FeaturedCarousel: React.FC<{ items: IBoardMessage[] }> = ({ items }) => {
  const rm = useReducedMotion();
  const [i, setI] = React.useState(0);
  const paused = React.useRef(false);
  const L = items.length;
  const idx = L ? ((i % L) + L) % L : 0;

  React.useEffect(() => {
    if (L < 2 || rm) return undefined;
    const h = window.setInterval(() => { if (!paused.current) setI(x => x + 1); }, 6500);
    return () => clearInterval(h);
  }, [L, rm, i === -1]);

  const m = items[idx];
  const set = (n: number): void => setI(n);
  return (
    <div className="oc-fc" role="region" aria-roledescription="carousel" aria-label="Featured messages"
      onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}
      onFocus={() => { paused.current = true; }} onBlur={() => { paused.current = false; }}>
      <div className="oc-fh">{'⭐'} Featured messages</div>
      <div className="oc-slide" key={m ? m.id : 'none'} aria-live={rm || L < 2 ? 'polite' : 'off'}>
        {m ? (
          <>
            <div className="oc-tg" style={{ justifyContent: 'center' }}>{m.tags.map(t => <span key={t}>{tagLabel(t)}</span>)}</div>
            <p className="oc-t">{m.message}</p>
            <Who m={m} />
          </>
        ) : <p className="oc-t">Featured messages will shine here.</p>}
      </div>
      {L > 1 ? (
        <div className="oc-nav">
          <button type="button" aria-label="Previous message" onClick={() => set(idx - 1)}>{'‹'}</button>
          {items.map((x, k) => (
            <button key={x.id} type="button" className="oc-dot" aria-label={'Show message ' + (k + 1)}
              aria-current={k === idx} onClick={() => set(k)} />
          ))}
          <button type="button" aria-label="Next message" onClick={() => set(idx + 1)}>{'›'}</button>
        </div>
      ) : null}
    </div>
  );
};
