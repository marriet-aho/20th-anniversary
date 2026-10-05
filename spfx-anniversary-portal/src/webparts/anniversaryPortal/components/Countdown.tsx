import * as React from 'react';
import { usePortal, useText } from './PortalContext';
import { countdownTo, pad } from '../logic/countdown';
import { DEFAULT_COUNTDOWN } from './defaults';
import { ManageLink } from './common/ManageLink';

const Flip: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [flip, setFlip] = React.useState(false);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (prev.current !== value) { prev.current = value; setFlip(true); const h = window.setTimeout(() => setFlip(false), 650); return () => clearTimeout(h); }
    return undefined;
  }, [value]);
  return (
    <div className="fu">
      <div className={'fc' + (flip ? ' fl' : '')}><b>{value}</b></div>
      <span>{label}</span>
    </div>
  );
};

export const Countdown: React.FC = () => {
  const { content } = usePortal();
  const t = useText();
  const target = (content['countdown.date'] && content['countdown.date'].date) || DEFAULT_COUNTDOWN;
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const h = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);
  const c = countdownTo(target, now);
  return (
    <section className="cdw">
      <div className="w">
        <h2>{t('countdown.title')}</h2>
        <p className="lead">{t('countdown.lead')}</p>
        <div className="cdn" role="timer" aria-label="Countdown to the celebration">
          <Flip value={pad(c.days)} label="Days" />
          <Flip value={pad(c.hours)} label="Hours" />
          <Flip value={pad(c.minutes)} label="Minutes" />
          <Flip value={pad(c.seconds)} label="Seconds" />
        </div>
        {c.done ? <p className="done" role="status">The celebration has begun. Happy 20th anniversary!</p> : null}
        <ManageLink name="PortalContent" />
      </div>
    </section>
  );
};
