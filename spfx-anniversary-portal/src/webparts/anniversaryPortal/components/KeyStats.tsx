import * as React from 'react';
import { IKeyStat } from '../models';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useInView } from '../hooks/useInView';

const Stat: React.FC<{ stat: IKeyStat; hi: boolean; go: boolean; rm: boolean }> = ({ stat, hi, go, rm }) => {
  const numeric = /^\d+$/.test(stat.value);
  const [shown, setShown] = React.useState<string>(numeric && !rm ? '0' : stat.value);
  React.useEffect(() => {
    if (!numeric || rm) { setShown(stat.value); return undefined; }
    if (!go) return undefined;
    const v = +stat.value;
    let raf = 0, t0: number | undefined;
    const f = (t: number): void => {
      t0 = t0 === undefined ? t : t0;
      const p = Math.min((t - t0) / 1200, 1);
      setShown(String(Math.round(v * p)));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [go, rm, numeric, stat.value]);
  return <div className={'stat' + (hi ? ' hi' : '')}><b>{shown}</b>{stat.label}</div>;
};

export const KeyStats: React.FC<{ stats: IKeyStat[] }> = ({ stats }) => {
  const rm = useReducedMotion();
  const [ref, seen] = useInView<HTMLDivElement>('0px');
  if (!stats.length) return null;
  return (
    <section className="alt">
      <div className="w g stats" ref={ref}>
        {stats.map(s => <Stat key={s.id} stat={s} hi={/branch/i.test(s.label)} go={seen} rm={rm} />)}
      </div>
    </section>
  );
};
